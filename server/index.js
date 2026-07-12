import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import * as rooms from './rooms.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');

const app = express();
app.use(express.json());
app.use(express.static(REPO_ROOT));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// code -> Set<WebSocket>, 소켓마다 ws.playerToken/ws.roomCode를 붙여서 추적
const roomSockets = new Map();

function broadcastRoomState(code) {
  const sockets = roomSockets.get(code);
  if (!sockets) return;
  for (const ws of sockets) {
    if (ws.readyState !== ws.OPEN) continue;
    try {
      const state = rooms.getState(code, ws.playerToken);
      ws.send(JSON.stringify({ type: 'roomState', room: state }));
    } catch {
      // 이미 방을 나간 토큰 - 조용히 무시 (close 핸들러가 곧 정리함)
    }
  }
}

function removeSocket(code, token) {
  const sockets = roomSockets.get(code);
  if (!sockets) return;
  for (const ws of sockets) {
    if (ws.playerToken !== token) continue;
    sockets.delete(ws);
    if (ws.readyState === ws.OPEN) ws.close(4001, 'left room');
  }
  if (sockets.size === 0) roomSockets.delete(code);
}

function afterLeave(code, token, result) {
  removeSocket(code, token);
  if (result.room) broadcastRoomState(code);
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const code = url.searchParams.get('code');
  const token = url.searchParams.get('token');

  let state;
  try {
    state = rooms.getState(code, token);
  } catch (err) {
    ws.close(4000, err.message || 'invalid room/token');
    return;
  }

  ws.playerToken = token;
  ws.roomCode = code;
  if (!roomSockets.has(code)) roomSockets.set(code, new Set());
  roomSockets.get(code).add(ws);

  ws.send(JSON.stringify({ type: 'roomState', room: state }));

  ws.on('close', () => {
    try {
      const result = rooms.leaveRoom(code, token);
      afterLeave(code, token, result);
    } catch {
      // REST /leave 등으로 이미 정리된 경우 - 소켓 세트에서만 마저 제거
      removeSocket(code, token);
    }
  });

  ws.on('error', () => {
    // 'close'가 뒤이어 발생하므로 별도 처리 불필요
  });
});

function getToken(req) {
  return req.get('X-Player-Token');
}

function handleRoomError(res, err) {
  if (err instanceof rooms.RoomError) {
    res.status(err.status).json({ error: err.message });
  } else {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}

app.post('/api/rooms', (req, res) => {
  try {
    const { nickname, mode, maxPlayers, templateId } = req.body ?? {};
    const { room, player } = rooms.createRoom({ nickname, mode, maxPlayers, templateId });
    res.status(201).json({
      code: room.code,
      playerId: player.id,
      token: player.token,
      isHost: true,
      room: rooms.roomToJSON(room, player.token),
    });
  } catch (err) {
    handleRoomError(res, err);
  }
});

app.post('/api/rooms/:code/join', (req, res) => {
  try {
    const { nickname } = req.body ?? {};
    const { room, player } = rooms.joinRoom(req.params.code, nickname);
    broadcastRoomState(room.code);
    res.status(201).json({
      playerId: player.id,
      token: player.token,
      isHost: false,
      room: rooms.roomToJSON(room, player.token),
    });
  } catch (err) {
    handleRoomError(res, err);
  }
});

app.post('/api/rooms/:code/nickname', (req, res) => {
  try {
    const token = getToken(req);
    const { nickname } = req.body ?? {};
    const state = rooms.updateNickname(req.params.code, token, nickname);
    broadcastRoomState(req.params.code);
    res.json(state);
  } catch (err) {
    handleRoomError(res, err);
  }
});

app.post('/api/rooms/:code/settings', (req, res) => {
  try {
    const token = getToken(req);
    const state = rooms.updateSettings(req.params.code, token, req.body ?? {});
    broadcastRoomState(req.params.code);
    res.json(state);
  } catch (err) {
    handleRoomError(res, err);
  }
});

app.post('/api/rooms/:code/start', (req, res) => {
  try {
    const token = getToken(req);
    const state = rooms.startRoom(req.params.code, token);
    broadcastRoomState(req.params.code);
    res.json(state);
  } catch (err) {
    handleRoomError(res, err);
  }
});

app.post('/api/rooms/:code/leave', (req, res) => {
  try {
    const token = getToken(req);
    const result = rooms.leaveRoom(req.params.code, token);
    afterLeave(req.params.code, token, result);
    res.json({ ok: true });
  } catch (err) {
    handleRoomError(res, err);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
