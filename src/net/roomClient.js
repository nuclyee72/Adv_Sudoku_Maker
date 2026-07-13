/**
 * roomClient.js — 멀티플레이 방 API(REST) + 상태 push(WebSocket) 클라이언트
 */
async function request(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Player-Token'] = token;

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error || `요청에 실패했습니다. (${res.status})`);
  }
  return json;
}

export function createRoom({ nickname, mode, maxPlayers, templateId }) {
  return request('POST', '/api/rooms', { body: { nickname, mode, maxPlayers, templateId } });
}

export function joinRoom(code, { nickname }) {
  return request('POST', `/api/rooms/${code}/join`, { body: { nickname } });
}

export function updateNickname(code, token, nickname) {
  return request('POST', `/api/rooms/${code}/nickname`, { token, body: { nickname } });
}

export function updateSettings(code, token, settings) {
  return request('POST', `/api/rooms/${code}/settings`, { token, body: settings });
}

export function startRoom(code, token, { puzzle } = {}) {
  return request('POST', `/api/rooms/${code}/start`, { token, body: { puzzle } });
}

export function finishRoom(code, token) {
  return request('POST', `/api/rooms/${code}/finish`, { token });
}

export function forfeitRoom(code, token) {
  return request('POST', `/api/rooms/${code}/forfeit`, { token });
}

export function leaveRoom(code, token) {
  return request('POST', `/api/rooms/${code}/leave`, { token });
}

/** 게임 종료 후 방을 나가지 않고 같은 방의 대기실로 돌아간다(전원에게 브로드캐스트됨) */
export function returnToWaiting(code, token) {
  return request('POST', `/api/rooms/${code}/return-to-waiting`, { token });
}

/** 협동 모드 중지 투표 - 찬성(agree:true)은 투표를 시작하거나 자신의 표를 더하고, 반대는 즉시 투표를 취소한다 */
export function castCoopVote(code, token, agree) {
  return request('POST', `/api/rooms/${code}/coop-vote`, { token, body: { agree } });
}

/** 협동 모드 - 로컬 저장 슬롯에서 불러온 스냅샷을 서버로 전송 (서버가 반영 후 전원에게 브로드캐스트) */
export function coopLoad(code, token, { cells }) {
  return request('POST', `/api/rooms/${code}/coop-load`, { token, body: { cells } });
}

/**
 * 방 상태 push를 받는 WebSocket 연결.
 * @returns {WebSocket} 호출측이 필요시 .close()로 명시적으로 나갈 수 있도록 소켓 인스턴스 반환
 */
export function connectSocket(code, token, { onState, onClose, onCoopCellUpdate, onCoopCursor, onCoopRotate } = {}) {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(`${proto}//${location.host}/ws?code=${code}&token=${token}`);

  socket.addEventListener('message', (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    if (msg.type === 'roomState' && onState) onState(msg.room);
    else if (msg.type === 'coopCellUpdate' && onCoopCellUpdate) onCoopCellUpdate(msg);
    else if (msg.type === 'coopCursor' && onCoopCursor) onCoopCursor(msg);
    else if (msg.type === 'coopRotate' && onCoopRotate) onCoopRotate(msg);
  });

  socket.addEventListener('close', () => {
    if (onClose) onClose();
  });

  return socket;
}

/** 협동 모드 셀 입력 의도를 서버로 전송 (서버가 검증/반영 후 전원에게 브로드캐스트) */
export function sendCoopEdit(socket, { row, col, value }) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ type: 'coopEdit', row, col, value }));
}

/** 협동 모드 커서 이동을 서버로 전송 (서버는 검증 없이 다른 참가자에게 relay) */
export function sendCoopCursor(socket, { row, col }) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ type: 'coopCursor', row, col }));
}

/** 협동 모드 턴테이블 회전 의도를 서버로 전송 (서버가 적용 후 전원에게 브로드캐스트) */
export function sendCoopRotate(socket, { originRow, originCol, steps }) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ type: 'coopRotate', originRow, originCol, steps }));
}
