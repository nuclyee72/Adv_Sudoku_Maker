import crypto from 'node:crypto';
import { Board } from '../src/core/Board.js';
import { Validator } from '../src/core/Validator.js';
import { reviveStructures } from '../src/puzzles/reviveStructures.js';
import { solveBoard } from '../src/generator/solveBoard.js';

const MODES = new Set(['battle', 'coop']);
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;
const NICKNAME_MAX_LEN = 20;
const BATTLE_COUNTDOWN_MS = 3000; // 배틀 시작 시 전원 동시 카운트다운 - 이 시간만큼 playingStartedAt을 미래로 잡는다

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

function validatePuzzle(puzzle) {
  if (!puzzle || !Array.isArray(puzzle.structures) || !Array.isArray(puzzle.givens)) {
    throw new RoomError(400, '퍼즐 데이터가 올바르지 않습니다.');
  }
  return puzzle;
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

function requireEnded(room) {
  if (room.status !== 'ended') throw new RoomError(409, '게임이 끝난 방에서만 가능합니다.');
}

/** 참가(join) 전용 - 협동은 진행 중인 방에도 도중 참가를 허용한다(다 같이 쓰는 보드라 늦게 들어와도 자연스러움).
 * 배틀은 개인전 진행 상황이 이미 갈렸으므로 여전히 대기 중일 때만 참가할 수 있다. */
function requireJoinable(room) {
  if (room.status === 'waiting') return;
  if (room.mode === 'coop' && room.status === 'playing') return;
  throw new RoomError(409, '대기 중인 방에서만 참가할 수 있습니다.');
}

function serializeCoopCells(room) {
  return room.coopBoard.getVisibleCells().map((c) => ({
    row: c.row,
    col: c.col,
    value: c.value,
    filledBy: c.filledBy ?? null,
  }));
}

export function roomToJSON(room, viewerToken) {
  const players = [...room.players.values()]
    .sort((a, b) => a.joinedAt - b.joinedAt)
    .map((p) => ({
      id: p.id,
      nickname: p.nickname,
      isHost: p.isHost,
      gameStatus: p.gameStatus,
      colorIndex: p.colorIndex,
      // 완주 시각(서버 기준) 대신 표시용 경과시간(ms)만 내려줌 - 클라이언트 시계와 무관하게 항상 같은 값
      elapsedMs: p.finishedAt !== null && room.playingStartedAt !== null
        ? p.finishedAt - room.playingStartedAt
        : null,
    }));

  const json = {
    code: room.code,
    mode: room.mode,
    maxPlayers: room.maxPlayers,
    templateId: room.templateId,
    status: room.status,
    players,
    playingStartedAt: room.playingStartedAt,
    endedAt: room.endedAt ?? null,
  };

  const inPlay = room.status === 'playing' || room.status === 'ended';
  if ((room.mode === 'battle' || room.mode === 'coop') && inPlay) {
    json.puzzle = room.puzzle;
  }
  if (room.mode === 'coop' && inPlay && room.coopBoard) {
    json.coopCells = serializeCoopCells(room);
  }
  if (room.mode === 'coop' && room.status === 'playing' && room.coopVote) {
    json.coopVote = { votes: [...room.coopVote.votes] };
  }

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
    gameStatus: null,
    finishedAt: null,
    colorIndex: 0,
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
    puzzle: null,
    playingStartedAt: null,
    endedAt: null,
    coopVote: null,
  };
  rooms.set(code, room);

  return { room, player };
}

export function joinRoom(code, nickname) {
  const room = getRoomOrThrow(code);
  requireJoinable(room);
  if (room.players.size >= room.maxPlayers) throw new RoomError(409, '방 정원이 가득 찼습니다.');

  const cleanNickname = validateNickname(nickname);
  const token = crypto.randomUUID();
  const player = {
    id: crypto.randomUUID(),
    token,
    nickname: cleanNickname,
    isHost: false,
    joinedAt: Date.now(),
    gameStatus: null,
    finishedAt: null,
    colorIndex: room.players.size,
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

export function startRoom(code, token, { puzzle } = {}) {
  const room = getRoomOrThrow(code);
  const player = getPlayerOrThrow(room, token);
  requireHost(room, player);
  requireWaiting(room);

  if (room.mode === 'battle') {
    room.puzzle = validatePuzzle(puzzle);
    for (const p of room.players.values()) {
      p.gameStatus = 'playing';
      p.finishedAt = null;
    }
  } else if (room.mode === 'coop') {
    room.puzzle = validatePuzzle(puzzle);
    // 서버가 직접 살아있는 Board를 authoritative하게 들고 있는다 - 클라이언트와 동일한
    // 코어 로직(src/core/*, src/structures/*)을 그대로 재사용해 규칙 검증을 이중 구현하지 않는다.
    const board = new Board();
    board.addStructures(reviveStructures(room.puzzle.structures));
    board.loadGivens(room.puzzle.givens);
    room.coopBoard = board;
    room.coopSolution = undefined; // 새 퍼즐이므로 이전 라운드의 캐시된 정답을 반드시 무효화
  }

  // 전원이 같은 순간에 시작하도록, "지금부터 카운트다운" 대신 미래의 한 시점을 공유 기준으로 잡는다
  room.playingStartedAt = Date.now() + BATTLE_COUNTDOWN_MS;

  room.status = 'playing';
  room.coopVote = null; // 이전 라운드에 남아있던 투표 상태 방어적으로 초기화
  room.updatedAt = Date.now();
  return roomToJSON(room, token);
}

/** 배틀 모드에서 아직 플레이 중인 인원이 1명 이하면 방을 종료 상태로 전환한다. */
function checkBattleEnd(room) {
  if (room.mode !== 'battle' || room.status !== 'playing') return;
  const stillPlaying = [...room.players.values()].filter((p) => p.gameStatus === 'playing');
  if (stillPlaying.length <= 1) {
    room.status = 'ended';
    room.updatedAt = Date.now();
  }
}

export function finishRoom(code, token) {
  const room = getRoomOrThrow(code);
  const player = getPlayerOrThrow(room, token);

  if (player.gameStatus === 'playing') {
    player.gameStatus = 'finished';
    player.finishedAt = Date.now();
    room.updatedAt = Date.now();
    checkBattleEnd(room);
  }
  return roomToJSON(room, token);
}

export function forfeitRoom(code, token) {
  const room = getRoomOrThrow(code);
  const player = getPlayerOrThrow(room, token);

  if (player.gameStatus === 'playing') {
    player.gameStatus = 'forfeited';
    room.updatedAt = Date.now();
    checkBattleEnd(room);
  }
  return roomToJSON(room, token);
}

/** 방은 그대로 유지한 채(참가자/코드 불변) 다음 라운드를 위해 대기 상태로 되돌린다.
 * 게임 종료(returnToWaiting) / 협동 중지 투표 전원 찬성(castCoopVote) 두 경로에서 공유한다. */
function resetRoomToWaiting(room) {
  room.status = 'waiting';
  room.puzzle = null;
  room.playingStartedAt = null;
  room.endedAt = null;
  room.coopBoard = undefined;
  room.coopSolution = undefined;
  room.coopVote = null;
  for (const p of room.players.values()) {
    p.gameStatus = null;
    p.finishedAt = null;
  }
  room.updatedAt = Date.now();
}

/** 게임 종료 후 "대기실로" — 방장뿐 아니라 누구나 부를 수 있다 - 다음 라운드로 넘어가는 건
 * 게임 시작처럼 신중해야 할 액션이 아니라, 결과 확인 후 다 같이 대기실로 돌아가는 것뿐이라서. */
export function returnToWaiting(code, token) {
  const room = getRoomOrThrow(code);
  getPlayerOrThrow(room, token);
  requireEnded(room);
  resetRoomToWaiting(room);
  return roomToJSON(room, token);
}

function requireCoopPlaying(room) {
  if (room.mode !== 'coop') throw new RoomError(409, '협동 모드 방이 아닙니다.');
  if (room.status !== 'playing') throw new RoomError(409, '진행 중인 게임이 아닙니다.');
}

/**
 * 협동 모드 중지 투표. "찬성"은 투표가 없으면 새로 시작하면서 자신도 찬성으로 세고,
 * 이미 진행 중이면 그냥 자신의 표를 더한다 - 그래서 "중지 투표" 버튼 클릭 자체가 곧
 * 첫 찬성표라 별도의 "투표 시작" API가 필요 없다. 전원이 찬성하면 즉시 대기실로 되돌린다.
 * "반대"는 한 명만 눌러도 그 즉시 투표 전체를 취소한다(만장일치가 아니면 의미가 없어서).
 */
export function castCoopVote(code, token, agree) {
  const room = getRoomOrThrow(code);
  const player = getPlayerOrThrow(room, token);
  requireCoopPlaying(room);

  if (!agree) {
    room.coopVote = null;
  } else {
    if (!room.coopVote) room.coopVote = { votes: new Set() };
    room.coopVote.votes.add(player.id);
    if (room.coopVote.votes.size >= room.players.size) {
      resetRoomToWaiting(room);
    }
  }
  room.updatedAt = Date.now();
  return roomToJSON(room, token);
}

/** Validator 재검증 + 완성 여부 판정 - 완성됐으면 room을 종료 상태로 전환(공유 완성 시각 기록) */
function finalizeCoopMove(room) {
  const board = room.coopBoard;
  Validator.validate(board);
  const solved = board.isSolved();
  if (solved) {
    room.status = 'ended';
    room.endedAt = Date.now(); // 전원이 동일한 "완성 시각"을 보도록 서버 기준으로 한 번만 기록
  }
  room.updatedAt = Date.now();
  return solved;
}

/**
 * 협동 모드 셀 입력을 서버측 authoritative Board에 적용한다.
 * @returns {{ row: number, col: number, value: number|null, filledBy: string, solved: boolean }}
 */
export function applyCoopEdit(code, token, { row, col, value }) {
  const room = getRoomOrThrow(code);
  const player = getPlayerOrThrow(room, token);
  requireCoopPlaying(room);

  const board = room.coopBoard;
  const cell = board.getCell(row, col);
  if (!cell || !cell.isVisible || cell.isGiven) {
    throw new RoomError(400, '입력할 수 없는 칸입니다.');
  }

  if (value === null) {
    cell.clear();
  } else {
    board.setValue(row, col, value);
  }
  cell.filledBy = value === null ? null : player.id;

  const solved = finalizeCoopMove(room);
  return { row, col, value: cell.value, filledBy: cell.filledBy, solved };
}

/**
 * 협동 모드 턴테이블 회전을 서버측 authoritative Board에 적용한다.
 * originRow/originCol로 어떤 턴테이블인지 식별한다(방 안에서 겹치지 않으므로 유일).
 * @returns {{ originRow: number, originCol: number, cells: Array, solved: boolean }}
 */
export function applyCoopRotate(code, token, { originRow, originCol, steps }) {
  const room = getRoomOrThrow(code);
  getPlayerOrThrow(room, token); // 참가자인지만 확인 - 회전은 특정 플레이어 소유가 아님
  requireCoopPlaying(room);

  if (!Number.isInteger(steps)) throw new RoomError(400, 'steps는 정수여야 합니다.');

  const board = room.coopBoard;
  const structure = board.structures.find(
    (s) => s.type === 'turntable' && s.originRow === originRow && s.originCol === originCol
  );
  if (!structure) throw new RoomError(400, '존재하지 않는 턴테이블입니다.');

  structure.rotate(board, steps);
  const solved = finalizeCoopMove(room);

  const cells = structure.coords.map(({ row, col }) => {
    const cell = board.getCell(row, col);
    return { row, col, value: cell.value, isGiven: cell.isGiven, filledBy: cell.filledBy ?? null };
  });
  return { originRow, originCol, cells, solved };
}

function turntableCellKeys(board) {
  const keys = new Set();
  for (const s of board.structures) {
    if (s.type !== 'turntable') continue;
    for (const { row, col } of s.coords) keys.add(`${row},${col}`);
  }
  return keys;
}

/** room.coopSolution을 처음 필요할 때 한 번만 준비해 캐싱한다(라운드당 1회, startRoom/
 * resetRoomToWaiting에서 무효화됨). 실패(모순 등)하면 null. */
async function ensureCoopSolution(room) {
  if (room.coopSolution) return room.coopSolution;

  // generatePuzzle()이 캐빙 전에 뜬 정답 스냅샷을 함께 보냈으면(멀티플레이는 항상 이 경로)
  // 그대로 쓴다 - 재계산이 필요 없고, 턴테이블 자유도로 인한 오답 위험도 없다.
  if (Array.isArray(room.puzzle.solution)) {
    const solution = new Map(room.puzzle.solution.map((s) => [`${s.row},${s.col}`, s.value]));
    room.coopSolution = solution;
    return solution;
  }

  // solution을 못 받은 경우에만 최선 노력으로 다시 풀어본다 - solveBoard는 구조체의
  // validate()를 호출하므로 JSON으로 받은 plain structures를 revive해서 넘겨야 한다.
  const solution = await solveBoard(reviveStructures(room.puzzle.structures), room.puzzle.givens);
  if (!solution) return null;
  room.coopSolution = solution;
  return solution;
}

/**
 * 협동 모드 정답 체크 - 현재 입력된 값이 정답과 일치하는 칸을 given으로 고정한다.
 * 값은 원래도 정답이었으므로 바꾸지 않는다. 턴테이블 영역은 회전 때문에 칸별 정답이
 * 고정되지 않아 제외한다.
 * @returns {{ cells: Array, solved: boolean }}
 */
export async function applyCoopAnswerCheck(code, token) {
  const room = getRoomOrThrow(code);
  getPlayerOrThrow(room, token);
  requireCoopPlaying(room);

  const solution = await ensureCoopSolution(room);
  if (!solution) throw new RoomError(500, '정답을 계산하지 못했습니다.');

  const board = room.coopBoard;
  const skip = turntableCellKeys(board);
  const cells = [];
  for (const cell of board.getVisibleCells()) {
    const k = `${cell.row},${cell.col}`;
    if (cell.isGiven || cell.value === null || skip.has(k)) continue;
    if (solution.get(k) !== cell.value) continue;
    cell.isGiven = true;
    cell.filledBy = null;
    cells.push({ row: cell.row, col: cell.col, value: cell.value, isGiven: true });
  }

  const solved = finalizeCoopMove(room);
  return { cells, solved };
}

/**
 * 협동 모드 정답 보기 - given이 아닌 칸(턴테이블 영역 제외)을 전부 정답값으로 채운다.
 * "체크"와 달리 given으로 고정하지 않는다 - 직접 입력한 값과 같은 형식(계속 수정 가능,
 * 특정 참가자가 채운 것으로 표시되지 않음)으로 채워 넣는다는 요청에 따른 것이다.
 * @returns {{ cells: Array, solved: boolean }}
 */
export async function applyCoopAnswerReveal(code, token) {
  const room = getRoomOrThrow(code);
  getPlayerOrThrow(room, token);
  requireCoopPlaying(room);

  const solution = await ensureCoopSolution(room);
  if (!solution) throw new RoomError(500, '정답을 계산하지 못했습니다.');

  const board = room.coopBoard;
  const skip = turntableCellKeys(board);
  const cells = [];
  for (const cell of board.getVisibleCells()) {
    const k = `${cell.row},${cell.col}`;
    if (cell.isGiven || skip.has(k) || !solution.has(k)) continue;
    cell.value = solution.get(k);
    cell.filledBy = null; // 특정 참가자가 채운 것처럼 보이지 않도록(모서리 색 없음)
    cells.push({ row: cell.row, col: cell.col, value: cell.value, isGiven: false });
  }

  const solved = finalizeCoopMove(room);
  return { cells, solved };
}

/**
 * 협동 모드 - 로컬 저장 슬롯에서 불러온 스냅샷(row/col/value 배열)을 서버측 authoritative
 * Board에 일괄 반영해 전원에게 동기화되게 한다. given 칸이나 존재하지 않는 칸은 조용히
 * 건너뛴다(다른 퍼즐용 저장 데이터를 잘못 불러와도 안전하게 무시되도록, 기존 싱글플레이
 * 불러오기와 같은 관대한 동작). 메모는 협동에서 로컬 전용 스코프라 아예 받지 않는다.
 * @returns {object} roomToJSON 결과
 */
export function applyCoopLoad(code, token, { cells }) {
  const room = getRoomOrThrow(code);
  const player = getPlayerOrThrow(room, token);
  requireCoopPlaying(room);
  if (!Array.isArray(cells)) throw new RoomError(400, '불러올 데이터가 올바르지 않습니다.');

  const board = room.coopBoard;
  for (const { row, col, value } of cells) {
    const cell = board.getCell(row, col);
    if (!cell || !cell.isVisible || cell.isGiven) continue;
    if (value === null || value === undefined) {
      cell.clear();
      cell.filledBy = null;
    } else {
      board.setValue(row, col, value);
      cell.filledBy = player.id;
    }
  }

  finalizeCoopMove(room);
  return roomToJSON(room, token);
}

/**
 * 협동 모드 커서 이동을 검증만 하고 그대로 relay한다 (보드 상태는 건드리지 않음).
 * @returns {{ playerId: string, row: number, col: number }}
 */
export function applyCoopCursor(code, token, { row, col }) {
  const room = getRoomOrThrow(code);
  const player = getPlayerOrThrow(room, token);
  requireCoopPlaying(room);
  return { playerId: player.id, row, col };
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
  checkBattleEnd(room);
  // 나간 사람 때문에 남은 인원 전체가 이미 찬성 상태였던 중지 투표가 뒤늦게 성립될 수 있다
  if (room.coopVote && room.coopVote.votes.size >= room.players.size) {
    resetRoomToWaiting(room);
  }
  return { room: roomToJSON(room), removedPlayerId: player.id };
}

export function getRoomRaw(code) {
  return rooms.get(code) ?? null;
}
