import crypto from 'node:crypto';

const MODES = new Set(['battle', 'coop']);
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;
const NICKNAME_MAX_LEN = 20;

export class RoomError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const rooms = new Map(); // code -> room

function validateNickname(nickname) {
  const trimmed = String(nickname ?? '').trim();
  if (!trimmed) throw new RoomError(400, '닉네임을 입력해주세요.');
  if (trimmed.length > NICKNAME_MAX_LEN) throw new RoomError(400, `닉네임은 ${NICKNAME_MAX_LEN}자 이내여야 합니다.`);
  return trimmed;
}

function validateMode(mode) {
  if (!MODES.has(mode)) throw new RoomError(400, 'mode는 battle 또는 coop여야 합니다.');
  return mode;
}

function validateMaxPlayers(maxPlayers) {
  const n = Number(maxPlayers);
  if (!Number.isInteger(n) || n < MIN_PLAYERS || n > MAX_PLAYERS) {
    throw new RoomError(400, `참가자 수는 ${MIN_PLAYERS}~${MAX_PLAYERS} 사이여야 합니다.`);
  }
  return n;
}

function validateTemplateId(templateId) {
  const trimmed = String(templateId ?? '').trim();
  if (!trimmed) throw new RoomError(400, '퍼즐 템플릿을 선택해주세요.');
  return trimmed;
}

function generateCode() {
  for (let attempt = 0; attempt < 50; attempt++) {
    const code = String(crypto.randomInt(0, 10000)).padStart(4, '0');
    if (!rooms.has(code)) return code;
  }
  throw new RoomError(503, '방 코드를 생성하지 못했습니다. 잠시 후 다시 시도해주세요.');
}

function getRoomOrThrow(code) {
  const room = rooms.get(code);
  if (!room) throw new RoomError(404, '존재하지 않는 방입니다.');
  return room;
}

function getPlayerOrThrow(room, token) {
  const player = room.players.get(token);
  if (!player) throw new RoomError(403, '이 방의 참가자가 아닙니다.');
  return player;
}

function requireHost(room, player) {
  if (!player.isHost) throw new RoomError(403, '방장만 할 수 있습니다.');
}

function requireWaiting(room) {
  if (room.status !== 'waiting') throw new RoomError(409, '대기 중인 방에서만 가능합니다.');
}

export function roomToJSON(room, viewerToken) {
  const players = [...room.players.values()]
    .sort((a, b) => a.joinedAt - b.joinedAt)
    .map((p) => ({ id: p.id, nickname: p.nickname, isHost: p.isHost }));

  const json = {
    code: room.code,
    mode: room.mode,
    maxPlayers: room.maxPlayers,
    templateId: room.templateId,
    status: room.status,
    players,
  };

  if (viewerToken) {
    const viewer = room.players.get(viewerToken);
    if (viewer) json.you = { id: viewer.id, isHost: viewer.isHost };
  }

  return json;
}

export function createRoom({ nickname, mode, maxPlayers, templateId }) {
  const cleanNickname = validateNickname(nickname);
  const cleanMode = validateMode(mode);
  const cleanMaxPlayers = validateMaxPlayers(maxPlayers);
  const cleanTemplateId = validateTemplateId(templateId);

  const code = generateCode();
  const now = Date.now();
  const token = crypto.randomUUID();
  const player = {
    id: crypto.randomUUID(),
    token,
    nickname: cleanNickname,
    isHost: true,
    joinedAt: now,
  };

  const room = {
    code,
    mode: cleanMode,
    maxPlayers: cleanMaxPlayers,
    templateId: cleanTemplateId,
    status: 'waiting',
    createdAt: now,
    updatedAt: now,
    players: new Map([[token, player]]),
  };
  rooms.set(code, room);

  return { room, player };
}

export function joinRoom(code, nickname) {
  const room = getRoomOrThrow(code);
  requireWaiting(room);
  if (room.players.size >= room.maxPlayers) throw new RoomError(409, '방 정원이 가득 찼습니다.');

  const cleanNickname = validateNickname(nickname);
  const token = crypto.randomUUID();
  const player = {
    id: crypto.randomUUID(),
    token,
    nickname: cleanNickname,
    isHost: false,
    joinedAt: Date.now(),
  };
  room.players.set(token, player);
  room.updatedAt = Date.now();

  return { room, player };
}

export function getState(code, token) {
  const room = getRoomOrThrow(code);
  getPlayerOrThrow(room, token);
  return roomToJSON(room, token);
}

export function updateNickname(code, token, nickname) {
  const room = getRoomOrThrow(code);
  const player = getPlayerOrThrow(room, token);
  player.nickname = validateNickname(nickname);
  room.updatedAt = Date.now();
  return roomToJSON(room, token);
}

export function updateSettings(code, token, { mode, maxPlayers, templateId } = {}) {
  const room = getRoomOrThrow(code);
  const player = getPlayerOrThrow(room, token);
  requireHost(room, player);
  requireWaiting(room);

  if (mode !== undefined) room.mode = validateMode(mode);
  if (maxPlayers !== undefined) {
    const cleanMaxPlayers = validateMaxPlayers(maxPlayers);
    if (cleanMaxPlayers < room.players.size) {
      throw new RoomError(400, '현재 참가자 수보다 적게 설정할 수 없습니다.');
    }
    room.maxPlayers = cleanMaxPlayers;
  }
  if (templateId !== undefined) room.templateId = validateTemplateId(templateId);

  room.updatedAt = Date.now();
  return roomToJSON(room, token);
}

export function startRoom(code, token) {
  const room = getRoomOrThrow(code);
  const player = getPlayerOrThrow(room, token);
  requireHost(room, player);
  requireWaiting(room);

  room.status = 'playing';
  room.updatedAt = Date.now();
  return roomToJSON(room, token);
}

/**
 * @returns {{ room: object|null, removedPlayerId: string }}
 * room이 null이면 방이 비어서 삭제된 것.
 */
export function leaveRoom(code, token) {
  const room = getRoomOrThrow(code);
  const player = getPlayerOrThrow(room, token);

  room.players.delete(token);

  if (room.players.size === 0) {
    rooms.delete(code);
    return { room: null, removedPlayerId: player.id };
  }

  if (player.isHost) {
    const next = [...room.players.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0];
    next.isHost = true;
  }

  room.updatedAt = Date.now();
  return { room: roomToJSON(room), removedPlayerId: player.id };
}

export function getRoomRaw(code) {
  return rooms.get(code) ?? null;
}
