import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import * as rooms from './rooms.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');

const app = express();
app.use(express.json({ limit: '2mb' })); // 배틀 모드 퍼즐 업로드(structures+givens)가 기본 100kb 한도를 넘을 수 있음
app.use(express.static(REPO_ROOT));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// code -> Set<WebSocket>, 소켓마다 ws.playerToken/ws.roomCode를 붙여서 추적
const roomSockets = new Map();

// "code:token" -> setTimeout id. 소켓이 끊겨도 곧바로 방을 나간 것으로 처리하지 않고
// 잠깐 유예를 둬서(새로고침 등으로 곧 같은 token으로 재접속하는 경우) 방에 남아있게 한다.
const RECONNECT_GRACE_MS = 8000;
const pendingLeaves = new Map();

function scheduleLeave(code, token) {
  const key = `${code}:${token}`;
  clearTimeout(pendingLeaves.get(key));
  const timeoutId = setTimeout(() => {
    pendingLeaves.delete(key);
    try {
      const result = rooms.leaveRoom(code, token);
      afterLeave(code, token, result);
    } catch {
      // 이미 REST /leave 등으로 정리됐거나 방이 사라짐 - 무시
    }
  }, RECONNECT_GRACE_MS);
  pendingLeaves.set(key, timeoutId);
}

function cancelScheduledLeave(code, token) {
  const key = `${code}:${token}`;
  const timeoutId = pendingLeaves.get(key);
  if (timeoutId === undefined) return;
  clearTimeout(timeoutId);
  pendingLeaves.delete(key);
}

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

function broadcastCoopCellUpdate(code, update) {
  const sockets = roomSockets.get(code);
  if (!sockets) return;
  const payload = JSON.stringify({ type: 'coopCellUpdate', ...update });
  for (const ws of sockets) {
    if (ws.readyState === ws.OPEN) ws.send(payload);
  }
}

function broadcastCoopCursor(code, senderWs, cursor) {
  const sockets = roomSockets.get(code);
  if (!sockets) return;
  const payload = JSON.stringify({ type: 'coopCursor', ...cursor });
  for (const ws of sockets) {
    if (ws === senderWs) continue;
    if (ws.readyState === ws.OPEN) ws.send(payload);
  }
}

function broadcastCoopRotate(code, result) {
  const sockets = roomSockets.get(code);
  if (!sockets) return;
  const payload = JSON.stringify({ type: 'coopRotate', ...result });
  for (const ws of sockets) {
    if (ws.readyState === ws.OPEN) ws.send(payload);
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
  cancelScheduledLeave(code, token);
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
  cancelScheduledLeave(code, token); // 유예 시간 안에 같은 토큰으로 재접속 - 나가기 취소

  ws.send(JSON.stringify({ type: 'roomState', room: state }));

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    try {
      if (msg.type === 'coopEdit') {
        const result = rooms.applyCoopEdit(ws.roomCode, ws.playerToken, {
          row: msg.row, col: msg.col, value: msg.value,
        });
        broadcastCoopCellUpdate(ws.roomCode, result);
        if (result.solved) broadcastRoomState(ws.roomCode);
      } else if (msg.type === 'coopCursor') {
        const result = rooms.applyCoopCursor(ws.roomCode, ws.playerToken, {
          row: msg.row, col: msg.col,
        });
        broadcastCoopCursor(ws.roomCode, ws, result);
      } else if (msg.type === 'coopRotate') {
        const result = rooms.applyCoopRotate(ws.roomCode, ws.playerToken, {
          originRow: msg.originRow, originCol: msg.originCol, steps: msg.steps,
        });
        broadcastCoopRotate(ws.roomCode, result);
        if (result.solved) broadcastRoomState(ws.roomCode);
      }
    } catch {
      // 잘못된 메시지나 방 종료 직후의 레이스 - 조용히 무시
    }
  });

  ws.on('close', () => {
    removeSocket(code, token); // 끊긴 소켓 자체는 즉시 정리(빈 소켓에 못 보내도록)
    scheduleLeave(code, token); // 방에서 실제로 나가는 건 유예 시간 뒤로 미룸(재접속 대비)
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
    const { puzzle } = req.body ?? {};
    const state = rooms.startRoom(req.params.code, token, { puzzle });
    broadcastRoomState(req.params.code);
    res.json(state);
  } catch (err) {
    handleRoomError(res, err);
  }
});

app.post('/api/rooms/:code/finish', (req, res) => {
  try {
    const token = getToken(req);
    const state = rooms.finishRoom(req.params.code, token);
    broadcastRoomState(req.params.code);
    res.json(state);
  } catch (err) {
    handleRoomError(res, err);
  }
});

app.post('/api/rooms/:code/forfeit', (req, res) => {
  try {
    const token = getToken(req);
    const state = rooms.forfeitRoom(req.params.code, token);
    broadcastRoomState(req.params.code);
    res.json(state);
  } catch (err) {
    handleRoomError(res, err);
  }
});

app.post('/api/rooms/:code/coop-load', (req, res) => {
  try {
    const token = getToken(req);
    const { cells } = req.body ?? {};
    const state = rooms.applyCoopLoad(req.params.code, token, { cells });
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
