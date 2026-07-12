/**
 * main.js — 진입점, 보드/UI 조립 및 이벤트 바인딩
 */
import { Board } from './core/Board.js';
import { BoardRenderer } from './ui/BoardRenderer.js';
import { DragPanel } from './ui/DragPanel.js';
import { Keypad } from './ui/Keypad.js';
import { PUZZLES } from './puzzles/index.js';
import { templates as GENERATE_TEMPLATES } from './generator/templates/index.js';
import { generatePuzzle } from './generator/generatePuzzle.js';
import * as roomClient from './net/roomClient.js';
import { reviveStructures } from './puzzles/reviveStructures.js';

const svg          = document.getElementById('sudoku-svg');
const boardPanel   = document.getElementById('board-panel');
const keypadPanel  = document.getElementById('keypad-panel');
const keypadGrid   = document.getElementById('keypad-grid');
const kpToggle     = document.getElementById('kp-toggle');
const btnResetAll  = document.getElementById('btn-reset-all');
const toast        = document.getElementById('toast');
const generateStatus = document.getElementById('generate-status');

const confirmModal   = document.getElementById('confirm-modal');
const confirmText    = document.getElementById('confirm-text');
const confirmOk      = document.getElementById('confirm-ok');
const confirmCancel  = document.getElementById('confirm-cancel');

const btnOpenPuzzle   = document.getElementById('btn-open-puzzle');
const btnOpenGenerate = document.getElementById('btn-open-generate');
const btnOpenSave     = document.getElementById('btn-open-save');
const btnOpenHelp     = document.getElementById('btn-open-help');
const puzzlePanel     = document.getElementById('puzzle-panel');
const generatePanel   = document.getElementById('generate-panel');
const savePanel       = document.getElementById('save-panel');
const helpPanel       = document.getElementById('help-panel');
const puzzleClose     = document.getElementById('puzzle-close');
const generateClose   = document.getElementById('generate-close');
const saveClose       = document.getElementById('save-close');
const helpClose       = document.getElementById('help-close');
const puzzleList      = document.getElementById('puzzle-list');
const generateList    = document.getElementById('generate-list');

const timerToggleBtn    = document.getElementById('btn-toggle-timer');
const timerDisplay      = document.getElementById('timer-display');
const boardWrapper      = document.querySelector('.board-wrapper');
const boardStartOverlay = document.getElementById('board-start-overlay');
const btnStartTimer     = document.getElementById('btn-start-timer');

const landingScreen      = document.getElementById('landing-screen');
const gameScreen         = document.getElementById('game-screen');
const landingMain        = document.getElementById('landing-main');
const landingMulti       = document.getElementById('landing-multi');
const landingCreate      = document.getElementById('landing-create');
const landingJoin        = document.getElementById('landing-join');
const btnLandingSingle   = document.getElementById('btn-landing-single');
const btnLandingMulti    = document.getElementById('btn-landing-multi');
const btnMpCreate        = document.getElementById('btn-mp-create');
const btnMpJoin          = document.getElementById('btn-mp-join');
const btnMpBack          = document.getElementById('btn-mp-back');
const btnGoLanding       = document.getElementById('btn-go-landing');

const lcNickname    = document.getElementById('lc-nickname');
const lcModeBattle  = document.getElementById('lc-mode-battle');
const lcModeCoop    = document.getElementById('lc-mode-coop');
const lcMaxPlayers  = document.getElementById('lc-max-players');
const lcTemplate    = document.getElementById('lc-template');
const lcError       = document.getElementById('lc-error');
const btnLcSubmit   = document.getElementById('btn-lc-submit');
const btnLcBack     = document.getElementById('btn-lc-back');

const ljNickname   = document.getElementById('lj-nickname');
const ljCode       = document.getElementById('lj-code');
const ljError      = document.getElementById('lj-error');
const btnLjSubmit  = document.getElementById('btn-lj-submit');
const btnLjBack    = document.getElementById('btn-lj-back');

const waitingRoomScreen = document.getElementById('waiting-room-screen');
const wrCode            = document.getElementById('wr-code');
const wrPlayerList      = document.getElementById('wr-player-list');
const wrModeBattle      = document.getElementById('wr-mode-battle');
const wrModeCoop        = document.getElementById('wr-mode-coop');
const wrMaxPlayers      = document.getElementById('wr-max-players');
const wrTemplate        = document.getElementById('wr-template');
const wrReadonlyNote    = document.getElementById('wr-readonly-note');
const wrBody            = document.getElementById('wr-body');
const wrStarting        = document.getElementById('wr-starting');
const wrError           = document.getElementById('wr-error');
const btnWrStart        = document.getElementById('btn-wr-start');
const wrWaitingNote     = document.getElementById('wr-waiting-note');
const btnWrLeave        = document.getElementById('btn-wr-leave');
const btnWrCopyCode     = document.getElementById('btn-wr-copy-code');

const battleLeaderboard      = document.getElementById('battle-leaderboard');
const battleLeaderboardList  = document.getElementById('battle-leaderboard-list');
const battleCountdownOverlay = document.getElementById('battle-countdown-overlay');
const battleCountdownNumber  = document.getElementById('battle-countdown-number');
const battleEndedOverlay    = document.getElementById('battle-ended-overlay');
const battleEndedList       = document.getElementById('battle-ended-list');
const btnBattleEndedLeave   = document.getElementById('btn-battle-ended-leave');

// ── 보드 조립 ──
const initialPuzzle = PUZZLES.find((p) => p.id === 'test_overlap4') || PUZZLES[0];
let activePuzzleId = initialPuzzle.id;

let board = new Board();
board.addStructures(initialPuzzle.structures);
board.loadGivens(initialPuzzle.givens);

const renderer = new BoardRenderer(svg, board);

// ── 초기 배치: 화면에 맞게 축소 후 중앙 정렬 ──
function fitAndCenterBoard() {
  const naturalW = parseFloat(svg.getAttribute('width'))  || 0;
  const naturalH = parseFloat(svg.getAttribute('height')) || 0;
  const availW   = window.innerWidth * 0.6;
  const availH   = window.innerHeight * 0.86;
  const fit = Math.min(1, availW / naturalW, availH / naturalH);

  renderer.setScale(fit); // wrapper 히트박스도 함께 축소된 크기로 동기화됨

  const scaledW = naturalW * fit;
  const scaledH = naturalH * fit;
  boardPanel.style.left = `${Math.round((window.innerWidth - scaledW) / 2 - 130)}px`;
  boardPanel.style.top  = `${Math.round((window.innerHeight - scaledH) / 2)}px`;
}
fitAndCenterBoard();

keypadPanel.style.left = `${window.innerWidth - 272}px`;
keypadPanel.style.top  = `${Math.round(window.innerHeight / 2 - 220)}px`;

// ── 드래그 패널 ──
const boardDrag = new DragPanel(boardPanel, boardPanel, {
  allowSVG: true,     // 게임 판(SVG 셀)을 잡아도 이동됨
  clamp: 'partial',   // 최소 한 칸만 보이면 화면 밖으로 나갈 수 있음
  minVisible: 56,
  contentEl: svg,      // 확대된 실제 크기를 기준으로 이동 범위 계산
  noZBoost: true,      // 게임 판을 클릭해도 키패드 패널보다 위로 올라오지 않음
});
renderer.boardDrag = boardDrag; // 드래그 직후 클릭에 의한 오선택 방지

new DragPanel(keypadPanel, keypadPanel, { clamp: 'full' });

renderer.setupWheel(boardPanel); // 마우스 커서 기준 부드러운 휠 줌

// ── 추가 메뉴 열기/닫기 (본 키패드는 그대로 두고, 왼쪽에 별도 메뉴가 펼쳐짐) ──
kpToggle.addEventListener('click', () => {
  const open = keypadPanel.classList.toggle('menu-open');
  kpToggle.textContent = open ? '›' : '‹';
});

// ── 메모 모드 (Lshift 또는 메모 버튼으로 토글) ──
function toggleNoteMode() {
  renderer.noteMode = !renderer.noteMode;
  keypad.setNoteMode(renderer.noteMode);
}

// ── 키패드 ──
const keypad = new Keypad(
  keypadGrid,
  (value) => { if (!boardLocked) renderer.inputValue(value); },
  () => { if (!boardLocked) toggleNoteMode(); },
  () => { if (!boardLocked) renderer.undo(); },
);

renderer.onCellSelect = (row, col) => {
  const cell = board.getCell(row, col);
  keypad.highlightValue(cell?.value ?? null);
};

renderer.selectFirstCell();

// ── 떠있는 패널 공통 열기/닫기 ──
function openPanel(panel) { panel.classList.add('show'); }
function closePanel(panel) { panel.classList.remove('show'); }
function isFloatingPanelOpen() {
  return savePanel.classList.contains('show')
    || helpPanel.classList.contains('show')
    || puzzlePanel.classList.contains('show')
    || generatePanel.classList.contains('show');
}

/** 저장/도움말/퍼즐 선택 패널 — 최초로 열릴 때만 화면 중앙 좌표를 계산해 배치, 이후엔 드래그로 옮긴 위치 유지 */
function openFloatingPanel(panel) {
  if (!panel.dataset.positioned) {
    const r = panel.getBoundingClientRect();
    panel.style.left = `${Math.round((window.innerWidth - r.width) / 2)}px`;
    panel.style.top  = `${Math.round((window.innerHeight - r.height) / 2)}px`;
    panel.dataset.positioned = '1';
  }
  openPanel(panel);
}

new DragPanel(savePanel, savePanel, { clamp: 'partial', minVisible: 40 });
new DragPanel(helpPanel, helpPanel, { clamp: 'partial', minVisible: 40 });
new DragPanel(puzzlePanel, puzzlePanel, { clamp: 'partial', minVisible: 40 });
new DragPanel(generatePanel, generatePanel, { clamp: 'partial', minVisible: 40 });

// ── 확인 모달 (모두 지우기 / 불러오기 / 퍼즐 변경 등 공용) ──
let pendingConfirmAction = null;

function openConfirmModal() { openPanel(confirmModal); }
function closeConfirmModal() { closePanel(confirmModal); }

function askConfirm(message, onConfirm) {
  confirmText.innerHTML = message;
  pendingConfirmAction = onConfirm;
  openConfirmModal();
}

function runPendingConfirm() {
  const action = pendingConfirmAction;
  pendingConfirmAction = null;
  closeConfirmModal();
  if (action) action();
}

function cancelConfirm() {
  pendingConfirmAction = null;
  closeConfirmModal();
}

confirmOk.addEventListener('click', runPendingConfirm);
confirmCancel.addEventListener('click', cancelConfirm);
confirmModal.addEventListener('click', (e) => {
  if (e.target === confirmModal) cancelConfirm(); // 배경 클릭 시 취소
});

btnResetAll.addEventListener('click', () => {
  if (boardLocked) return;
  btnResetAll.classList.add('pressed');
  setTimeout(() => btnResetAll.classList.remove('pressed'), 130);
  askConfirm('입력한 숫자를 모두 지울까요?<br/>초기 제공 숫자는 유지됩니다.', () => renderer.resetBoard());
});

// ── 저장 / 불러오기 ──
const SAVE_KEY_PREFIX = 'adv-sudoku-save-';
const slotKey = (n) => `${SAVE_KEY_PREFIX}${n}`;

function clearAllSaveSlots() {
  for (let n = 1; n <= 3; n++) localStorage.removeItem(slotKey(n));
}

function refreshSaveSlots() {
  document.querySelectorAll('.load-btn').forEach((btn) => {
    const has = !!localStorage.getItem(slotKey(btn.dataset.slot));
    btn.disabled = !has;
    btn.textContent = has ? '불러오기' : '비어있음';
  });
}

function toggleSavePanel() {
  if (savePanel.classList.contains('show')) { closePanel(savePanel); return; }
  refreshSaveSlots();
  openFloatingPanel(savePanel);
}

function toggleHelpPanel() {
  if (helpPanel.classList.contains('show')) closePanel(helpPanel);
  else openFloatingPanel(helpPanel);
}

btnOpenSave.addEventListener('click', toggleSavePanel);
btnOpenHelp.addEventListener('click', toggleHelpPanel);
saveClose.addEventListener('click', () => closePanel(savePanel));
helpClose.addEventListener('click', () => closePanel(helpPanel));

document.querySelectorAll('.save-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    localStorage.setItem(slotKey(btn.dataset.slot), JSON.stringify(board.serialize()));
    refreshSaveSlots();
  });
});

document.querySelectorAll('.load-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const raw = localStorage.getItem(slotKey(btn.dataset.slot));
    if (!raw) return;
    askConfirm(`슬롯 ${btn.dataset.slot}을 불러올까요?<br/>현재 진행 상황은 사라집니다.`, () => {
      try {
        board.loadSerialized(JSON.parse(raw));
        renderer.refresh();
        closePanel(savePanel);
      } catch {
        // 저장된 데이터가 손상된 경우 조용히 무시
      }
    });
  });
});

// ── 퍼즐 선택 ──
/** structures/givens로 새 Board를 만들어 렌더러에 장착한다 (싱글플레이/배틀 공용) */
function mountBoard(structures, givens) {
  board = new Board();
  board.addStructures(structures);
  board.loadGivens(givens);
  renderer.loadBoard(board);
  fitAndCenterBoard();
  renderer.selectFirstCell();
}

function loadPuzzle(puzzle) {
  mountBoard(puzzle.structures, puzzle.givens);
  activePuzzleId = puzzle.id;
  clearAllSaveSlots();
  refreshSaveSlots(); // 세이브 패널이 이미 열려있어도 즉시 "비어있음"으로 반영
  closePanel(puzzlePanel);
  if (timerEnabled) armTimer(); // 타이머 켜져있으면 새 퍼즐도 "시작" 누르기 전까지 잠금
}

function renderPuzzleList() {
  puzzleList.innerHTML = '';
  for (const p of PUZZLES) {
    const isActive = p.id === activePuzzleId;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'puzzle-item' + (isActive ? ' active' : '');
    btn.textContent = isActive ? `${p.name}  ✓` : p.name;
    if (!isActive) {
      btn.addEventListener('click', () => {
        askConfirm(`'${p.name}'(으)로 바꿀까요?<br/>저장된 슬롯이 모두 초기화됩니다.`, () => loadPuzzle(p));
      });
    }
    puzzleList.appendChild(btn);
  }
}

function togglePuzzlePanel() {
  if (puzzlePanel.classList.contains('show')) { closePanel(puzzlePanel); return; }
  renderPuzzleList();
  openFloatingPanel(puzzlePanel);
}

btnOpenPuzzle.addEventListener('click', togglePuzzlePanel);
puzzleClose.addEventListener('click', () => closePanel(puzzlePanel));

// ── 자동 생성 ──
async function runGenerate(template) {
  closePanel(generatePanel);
  btnOpenGenerate.disabled = true;
  generateStatus.textContent = '🎲 생성 중...';
  generateStatus.classList.add('show');
  try {
    const puzzle = await generatePuzzle(template);
    loadPuzzle(puzzle);
  } catch (err) {
    console.error(err);
    generateStatus.textContent = '⚠️ 퍼즐 생성 실패, 다시 시도해주세요';
    setTimeout(() => generateStatus.classList.remove('show'), 2400);
    return;
  } finally {
    btnOpenGenerate.disabled = false;
  }
  generateStatus.classList.remove('show');
}

function renderGenerateList() {
  generateList.innerHTML = '';
  for (const template of GENERATE_TEMPLATES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'puzzle-item';
    btn.textContent = template.label;
    btn.addEventListener('click', () => {
      askConfirm(`'${template.label}' 템플릿으로 새 퍼즐을 생성할까요?<br/>저장된 슬롯이 모두 초기화됩니다.`, () => runGenerate(template));
    });
    generateList.appendChild(btn);
  }
}

function toggleGeneratePanel() {
  if (generatePanel.classList.contains('show')) { closePanel(generatePanel); return; }
  renderGenerateList();
  openFloatingPanel(generatePanel);
}

btnOpenGenerate.addEventListener('click', toggleGeneratePanel);
generateClose.addEventListener('click', () => closePanel(generatePanel));

// ── 랜딩 / 게임 / 대기실 화면 전환 ──
const LANDING_SUBVIEWS = [landingMain, landingMulti, landingCreate, landingJoin];

function showLandingSub(target) {
  for (const el of LANDING_SUBVIEWS) el.hidden = (el !== target);
}

function isGameActive() {
  return !gameScreen.classList.contains('hidden');
}

function hideAllTopScreens() {
  landingScreen.classList.add('hidden');
  gameScreen.classList.add('hidden');
  waitingRoomScreen.classList.add('hidden');
}

function enterGame() {
  hideAllTopScreens();
  gameScreen.classList.remove('hidden');
}

function enterLandingAt(subview) {
  hideAllTopScreens();
  landingScreen.classList.remove('hidden');
  showLandingSub(subview);
}

function enterLanding() {
  exitBattleUI();
  if (mp) leaveCurrentRoom(); // 대기실/배틀에 있던 상태로 메인 화면으로 돌아가면 방도 함께 나감
  enterLandingAt(landingMain);
}

function enterWaitingRoom() {
  hideAllTopScreens();
  waitingRoomScreen.classList.remove('hidden');
}

btnLandingSingle.addEventListener('click', enterGame);
btnLandingMulti.addEventListener('click', () => showLandingSub(landingMulti));
btnMpCreate.addEventListener('click', () => { prefillNickname(lcNickname); showFormError(lcError, ''); showLandingSub(landingCreate); });
btnMpJoin.addEventListener('click', () => { prefillNickname(ljNickname); showFormError(ljError, ''); showLandingSub(landingJoin); });
btnMpBack.addEventListener('click', () => showLandingSub(landingMain));
btnLcBack.addEventListener('click', () => showLandingSub(landingMulti));
btnLjBack.addEventListener('click', () => showLandingSub(landingMulti));
btnGoLanding.addEventListener('click', () => {
  if (battleActive && !battleFinishedLocally) {
    askConfirm('항복하고 나갈까요?<br/>순위에는 들지 못해요.', async () => {
      if (mp) {
        try { await roomClient.forfeitRoom(mp.code, mp.token); } catch (err) { console.error(err); }
      }
      // 방은 그대로 유지(소켓도 유지) - 다른 참가자의 리더보드/종료 결과에 "항복"으로 계속 보이도록.
      // 게임이 끝나면 handleRoomPush가 조용히 정리한다.
      exitBattleUI();
      enterLandingAt(landingMulti);
    });
    return;
  }
  askConfirm('메인 화면으로 돌아갈까요?', enterLanding);
});

// ── 멀티플레이 ──
const NICKNAME_STORAGE_KEY = 'sudoku-nickname';

function loadSavedNickname() {
  try { return localStorage.getItem(NICKNAME_STORAGE_KEY) || ''; } catch { return ''; }
}
function saveNickname(nickname) {
  try { localStorage.setItem(NICKNAME_STORAGE_KEY, nickname); } catch { /* 저장 실패해도 게임 진행엔 지장 없음 */ }
}
function prefillNickname(input) {
  input.value = loadSavedNickname();
}

function populateTemplateSelect(select) {
  select.innerHTML = '';
  for (const t of GENERATE_TEMPLATES) {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.label;
    select.appendChild(opt);
  }
}
populateTemplateSelect(lcTemplate);
populateTemplateSelect(wrTemplate);

function showFormError(el, message) {
  el.textContent = message || '';
  el.classList.toggle('show', !!message);
}

function setModeToggle(battleBtn, coopBtn, mode, { disabled = false } = {}) {
  battleBtn.classList.toggle('active', mode === 'battle');
  coopBtn.classList.toggle('active', mode === 'coop');
  battleBtn.disabled = disabled;
  coopBtn.disabled = disabled;
}

let lcMode = 'battle';
lcModeBattle.addEventListener('click', () => { lcMode = 'battle'; setModeToggle(lcModeBattle, lcModeCoop, lcMode); });
lcModeCoop.addEventListener('click', () => { lcMode = 'coop'; setModeToggle(lcModeBattle, lcModeCoop, lcMode); });

let mp = null;             // { code, token, isHost, socket }
let lastRoomState = null;  // 마지막으로 받은 roomState push (닉네임 편집 취소/설정 실패 시 복원용)
let leavingIntentionally = false;

function connectRoomSocket(code, token) {
  return roomClient.connectSocket(code, token, {
    onState: handleRoomPush,
    onClose: () => {
      if (leavingIntentionally) { leavingIntentionally = false; return; }
      // 서버 재시작 등 예기치 않은 연결 끊김 - 조용히 방 목록 화면으로 복귀
      mp = null;
      lastRoomState = null;
      enterLandingAt(landingMulti);
    },
  });
}

async function leaveCurrentRoom() {
  if (!mp) return;
  const { code, token, socket } = mp;
  leavingIntentionally = true;
  try { await roomClient.leaveRoom(code, token); } catch { /* 이미 사라졌을 수 있음 - 무시 */ }
  if (socket && socket.readyState === WebSocket.OPEN) socket.close();
  mp = null;
  lastRoomState = null;
}

function enterRoom({ token, isHost, room }) {
  if (mp?.socket) mp.socket.close(); // 이전에 항복하고 남아있던 소켓이 있다면 정리
  mp = { code: room.code, token, isHost, socket: null };
  mp.socket = connectRoomSocket(room.code, token);
  enterWaitingRoom();
  renderWaitingRoom(room); // 최초 push 도착 전 화면 깜빡임 방지용 즉시 렌더
}

btnLcSubmit.addEventListener('click', async () => {
  showFormError(lcError, '');
  const nickname = lcNickname.value.trim();
  if (!nickname) { showFormError(lcError, '닉네임을 입력해주세요.'); return; }
  saveNickname(nickname);

  btnLcSubmit.disabled = true;
  btnLcSubmit.textContent = '생성 중...';
  try {
    const result = await roomClient.createRoom({
      nickname,
      mode: lcMode,
      maxPlayers: Number(lcMaxPlayers.value),
      templateId: lcTemplate.value,
    });
    enterRoom(result);
  } catch (err) {
    showFormError(lcError, err.message);
  } finally {
    btnLcSubmit.disabled = false;
    btnLcSubmit.textContent = '방 생성';
  }
});

btnLjSubmit.addEventListener('click', async () => {
  showFormError(ljError, '');
  const nickname = ljNickname.value.trim();
  const code = ljCode.value.trim();
  if (!nickname) { showFormError(ljError, '닉네임을 입력해주세요.'); return; }
  if (!/^\d{4}$/.test(code)) { showFormError(ljError, '4자리 방 코드를 입력해주세요.'); return; }
  saveNickname(nickname);

  btnLjSubmit.disabled = true;
  btnLjSubmit.textContent = '참가 중...';
  try {
    const result = await roomClient.joinRoom(code, { nickname });
    enterRoom(result);
  } catch (err) {
    showFormError(ljError, err.message);
  } finally {
    btnLjSubmit.disabled = false;
    btnLjSubmit.textContent = '참가';
  }
});

function startNicknameEdit(row, currentNickname) {
  row.innerHTML = '';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'wr-nickname-input';
  input.maxLength = 20;
  input.value = currentNickname;
  row.appendChild(input);
  input.focus();
  input.select();

  const commit = async () => {
    const value = input.value.trim();
    if (value && value !== currentNickname && mp) {
      saveNickname(value);
      try {
        await roomClient.updateNickname(mp.code, mp.token, value);
      } catch (err) {
        showFormError(wrError, err.message);
      }
    }
    if (lastRoomState) renderWaitingRoom(lastRoomState);
  };

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { input.value = currentNickname; input.blur(); }
  });
}

async function applySettingChange(partial) {
  if (!mp || !mp.isHost) return;
  showFormError(wrError, '');
  try {
    await roomClient.updateSettings(mp.code, mp.token, partial);
  } catch (err) {
    showFormError(wrError, err.message);
    if (lastRoomState) renderWaitingRoom(lastRoomState); // 실패 시 폼을 서버 기준 값으로 되돌림
  }
}

wrModeBattle.addEventListener('click', () => applySettingChange({ mode: 'battle' }));
wrModeCoop.addEventListener('click', () => applySettingChange({ mode: 'coop' }));
wrMaxPlayers.addEventListener('change', () => applySettingChange({ maxPlayers: Number(wrMaxPlayers.value) }));
wrTemplate.addEventListener('change', () => applySettingChange({ templateId: wrTemplate.value }));

btnWrStart.addEventListener('click', async () => {
  if (!mp || !lastRoomState) return;
  showFormError(wrError, '');
  btnWrStart.disabled = true;
  try {
    if (lastRoomState.mode === 'battle') {
      btnWrStart.textContent = '생성 중...';
      const template = GENERATE_TEMPLATES.find((t) => t.id === lastRoomState.templateId);
      if (!template) throw new Error('선택된 템플릿을 찾을 수 없어요.');
      const puzzle = await generatePuzzle(template);
      await roomClient.startRoom(mp.code, mp.token, {
        puzzle: { structures: puzzle.structures, givens: puzzle.givens },
      });
    } else {
      await roomClient.startRoom(mp.code, mp.token);
    }
  } catch (err) {
    showFormError(wrError, err.message);
  } finally {
    btnWrStart.disabled = false;
    btnWrStart.textContent = '게임 시작';
  }
});

btnWrLeave.addEventListener('click', async () => {
  btnWrLeave.disabled = true;
  await leaveCurrentRoom();
  btnWrLeave.disabled = false;
  enterLandingAt(landingMulti);
});

/**
 * navigator.clipboard는 보안 컨텍스트(https 또는 localhost)에서만 존재한다.
 * LAN IP(http://192.168.x.x 등)로 접속한 경우처럼 그 외 상황엔 없거나 던질 수 있어
 * 임시 textarea + execCommand('copy') 폴백으로 대응한다.
 */
async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error(err);
    }
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch (err) {
    console.error(err);
    return false;
  }
}

btnWrCopyCode.addEventListener('click', async () => {
  if (!mp) return;
  const ok = await copyText(mp.code);
  btnWrCopyCode.textContent = ok ? '복사됨!' : '복사 실패';
  setTimeout(() => { btnWrCopyCode.textContent = '복사'; }, 1500);
});

function renderWaitingRoom(room) {
  if (!mp) return; // 이미 나간 뒤 도착한 지연 push 방어
  lastRoomState = room;
  wrCode.textContent = room.code;

  const isHost = room.you?.isHost ?? false;
  mp.isHost = isHost;

  wrPlayerList.innerHTML = '';
  for (const p of room.players) {
    const row = document.createElement('div');
    row.className = 'wr-player-row';
    const isMe = p.id === room.you?.id;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'wr-player-nickname';
    nameSpan.textContent = p.nickname;
    row.appendChild(nameSpan);

    if (p.isHost) {
      const badge = document.createElement('span');
      badge.className = 'wr-host-badge';
      badge.textContent = '방장';
      row.appendChild(badge);
    }

    if (isMe) {
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'wr-nickname-edit-btn';
      editBtn.textContent = '✎';
      editBtn.addEventListener('click', () => startNicknameEdit(row, p.nickname));
      row.appendChild(editBtn);
    }

    wrPlayerList.appendChild(row);
  }

  setModeToggle(wrModeBattle, wrModeCoop, room.mode, { disabled: !isHost });
  wrMaxPlayers.value = room.maxPlayers;
  wrMaxPlayers.disabled = !isHost;
  wrTemplate.value = room.templateId;
  wrTemplate.disabled = !isHost;
  wrReadonlyNote.hidden = isHost;

  const playing = room.status === 'playing';
  wrBody.hidden = playing;
  wrStarting.hidden = !playing;
  btnWrStart.hidden = !isHost || playing;
  wrWaitingNote.hidden = isHost || playing;
}

// ── 배틀 모드 ──
let battleActive = false;          // 지금 배틀 게임 화면에 들어와 있는지
let battleFinishedLocally = false; // 이번 배틀에서 이미 완주 보고를 했는지 (중복 보고 방지)
let battleRAF = null;
let battleCountdownRAF = null;

/** roomState push를 받을 때마다: 방 상태에 따라 대기실/배틀 화면 중 어디를 갱신할지 정한다 */
function handleRoomPush(room) {
  if (!mp) return;
  mp.isHost = room.you?.isHost ?? mp.isHost;

  if (room.status === 'ended') {
    lastRoomState = room;
    if (battleActive) {
      showBattleEndedOverlay(room);
    } else {
      // 항복 등으로 이미 배틀 화면을 벗어난 상태(랜딩에 있음) - 볼 화면이 없으므로 방 연결만 조용히 정리
      leaveCurrentRoom();
    }
    return;
  }

  if (room.mode === 'battle' && room.status === 'playing') {
    lastRoomState = room;
    if (!battleActive) enterBattleGame(room);
    return; // 이미 배틀 중이면 rAF 루프가 lastRoomState를 계속 읽어 그리므로 별도 렌더 불필요
  }

  renderWaitingRoom(room);
}

function setBattleControlsDisabled(disabled) {
  btnOpenPuzzle.disabled = disabled;
  btnOpenGenerate.disabled = disabled;
  btnOpenSave.disabled = disabled;
  timerToggleBtn.disabled = disabled;
}

/** 배틀 시작 카운트다운 — 서버가 정한 미래 시각(playingStartedAt)까지 전원 동시에 센다 */
function startBattleCountdown(playingStartedAt) {
  stopBattleCountdown();
  const remaining = playingStartedAt - Date.now();
  if (remaining <= 0) return; // 이미 시작 시각이 지남(늦게 입장 등) - 카운트다운 없이 바로 시작

  boardLocked = true;
  boardWrapper.classList.add('blurred');
  battleCountdownOverlay.classList.remove('hidden');

  function frame() {
    const left = playingStartedAt - Date.now();
    if (left <= 0) { stopBattleCountdown(); return; }
    battleCountdownNumber.textContent = String(Math.ceil(left / 1000));
    battleCountdownRAF = requestAnimationFrame(frame);
  }
  frame();
}

function stopBattleCountdown() {
  if (battleCountdownRAF !== null) { cancelAnimationFrame(battleCountdownRAF); battleCountdownRAF = null; }
  boardLocked = false;
  boardWrapper.classList.remove('blurred');
  battleCountdownOverlay.classList.add('hidden');
}

/** 배틀 화면에서 벗어날 때(항복/완주 후 나가기/게임 종료) 공통 정리 */
function exitBattleUI() {
  battleActive = false;
  battleFinishedLocally = false;
  stopBattleLeaderboardLoop();
  stopBattleCountdown();
  battleLeaderboard.classList.add('hidden');
  closePanel(battleEndedOverlay);
  setBattleControlsDisabled(false);
}

function enterBattleGame(room) {
  const structures = reviveStructures(room.puzzle.structures);
  mountBoard(structures, room.puzzle.givens);

  // 싱글플레이용 연습 타이머(블러+시작 오버레이)는 배틀과 무관하므로 완전히 꺼둔다
  timerEnabled = false;
  timerToggleBtn.classList.remove('active');
  timerDisplay.classList.remove('show');
  disarmTimer();

  setBattleControlsDisabled(true);
  enterGame();

  battleActive = true;
  battleFinishedLocally = false;
  battleLeaderboard.classList.remove('hidden');
  renderBattleLeaderboard(room);
  startBattleLeaderboardLoop();
  startBattleCountdown(room.playingStartedAt); // 이미 시작 시각이 지났으면 내부에서 알아서 스킵
}

function renderBattleLeaderboardInto(listEl, room, { showUnfinishedAsDNF = false } = {}) {
  if (!room || !room.playingStartedAt) return;
  const now = Date.now();
  const finished = room.players.filter((p) => p.gameStatus === 'finished').sort((a, b) => a.elapsedMs - b.elapsedMs);
  const playing = room.players.filter((p) => p.gameStatus === 'playing');
  const forfeited = room.players.filter((p) => p.gameStatus === 'forfeited');
  const ordered = [...finished, ...playing, ...forfeited];

  listEl.innerHTML = '';
  for (const p of ordered) {
    const row = document.createElement('div');
    row.className = 'battle-leaderboard-row';

    let rankText = '';
    let timerText;
    if (p.gameStatus === 'finished') {
      rankText = String(finished.indexOf(p) + 1);
      timerText = formatTimer(p.elapsedMs ?? 0);
      row.classList.add('battle-finished');
    } else if (p.gameStatus === 'forfeited') {
      timerText = '항복';
      row.classList.add('battle-forfeited');
    } else {
      timerText = showUnfinishedAsDNF ? '미완주' : formatTimer(Math.max(0, now - room.playingStartedAt));
    }

    const rank = document.createElement('span');
    rank.className = 'battle-rank';
    rank.textContent = rankText;
    row.appendChild(rank);

    const name = document.createElement('span');
    name.className = 'battle-nickname';
    name.textContent = p.nickname;
    row.appendChild(name);

    const timer = document.createElement('span');
    timer.className = 'battle-timer';
    timer.textContent = timerText;
    row.appendChild(timer);

    listEl.appendChild(row);
  }
}

function renderBattleLeaderboard(room) {
  renderBattleLeaderboardInto(battleLeaderboardList, room);
}

function battleLeaderboardFrame() {
  if (!battleActive) return;
  if (lastRoomState) renderBattleLeaderboard(lastRoomState);
  battleRAF = requestAnimationFrame(battleLeaderboardFrame);
}

function startBattleLeaderboardLoop() {
  stopBattleLeaderboardLoop();
  battleRAF = requestAnimationFrame(battleLeaderboardFrame);
}

function stopBattleLeaderboardLoop() {
  if (battleRAF !== null) { cancelAnimationFrame(battleRAF); battleRAF = null; }
}

function showBattleEndedOverlay(room) {
  stopBattleLeaderboardLoop();
  battleActive = false;
  renderBattleLeaderboardInto(battleEndedList, room, { showUnfinishedAsDNF: true });
  openPanel(battleEndedOverlay);
}

btnBattleEndedLeave.addEventListener('click', async () => {
  exitBattleUI();
  await leaveCurrentRoom();
  enterLandingAt(landingMulti);
});

document.addEventListener('sudoku:solved', () => {
  if (!battleActive || battleFinishedLocally || !mp) return;
  battleFinishedLocally = true;
  roomClient.finishRoom(mp.code, mp.token).catch((err) => console.error(err));
});

// ── 타이머 ──
let timerEnabled   = false;
let timerRunning   = false;
let boardLocked    = false; // 타이머가 켜져 있고 아직 "시작"을 누르기 전 (게임판 조작 차단)
let timerElapsedMs = 0;
let timerStartedAt = 0;
let timerRAF       = null;

function formatTimer(ms) {
  const total = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const hundredths = Math.floor((total % 1000) / 10);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(minutes)}:${pad(seconds)}.${pad(hundredths)}`;
}

function renderTimerDisplay() {
  const current = timerElapsedMs + (timerRunning ? performance.now() - timerStartedAt : 0);
  timerDisplay.textContent = formatTimer(current);
}

function timerFrame() {
  renderTimerDisplay();
  if (timerRunning) timerRAF = requestAnimationFrame(timerFrame);
}

function stopTimerFrame() {
  if (timerRAF !== null) {
    cancelAnimationFrame(timerRAF);
    timerRAF = null;
  }
}

/** 타이머 켜짐 / 새 퍼즐 로드: "시작" 누르기 전 상태로 리셋하고 게임판을 블러+잠금 */
function armTimer() {
  timerRunning = false;
  timerElapsedMs = 0;
  stopTimerFrame();
  renderTimerDisplay();
  boardLocked = true;
  boardWrapper.classList.add('blurred');
  boardStartOverlay.classList.add('show');
}

/** 타이머 꺼짐: 블러/잠금 해제, 시간 리셋 */
function disarmTimer() {
  timerRunning = false;
  timerElapsedMs = 0;
  stopTimerFrame();
  boardLocked = false;
  boardWrapper.classList.remove('blurred');
  boardStartOverlay.classList.remove('show');
}

timerToggleBtn.addEventListener('click', () => {
  timerEnabled = !timerEnabled;
  timerToggleBtn.classList.toggle('active', timerEnabled);
  timerDisplay.classList.toggle('show', timerEnabled);
  if (timerEnabled) armTimer();
  else disarmTimer();
});

btnStartTimer.addEventListener('click', () => {
  if (!timerEnabled || timerRunning) return;
  boardLocked = false;
  boardWrapper.classList.remove('blurred');
  boardStartOverlay.classList.remove('show');
  timerRunning = true;
  timerStartedAt = performance.now();
  timerFrame();
});

document.addEventListener('sudoku:solved', () => {
  if (timerRunning) {
    timerElapsedMs += performance.now() - timerStartedAt;
    timerRunning = false;
    stopTimerFrame();
    renderTimerDisplay();
  }
});

// ── 키보드 단축키 ──
const ARROW_DIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

window.addEventListener('keydown', (e) => {
  // 0) 랜딩 화면에서는(게임 화면이 안 보이는 동안) 게임 조작 단축키를 전부 무시
  if (!isGameActive()) return;

  // 1) 확인 모달이 떠 있으면 그 외 모든 단축키 차단, Esc/Enter만 처리
  if (confirmModal.classList.contains('show')) {
    if (e.key === 'Escape') cancelConfirm();
    else if (e.key === 'Enter') runPendingConfirm();
    return;
  }

  // 2) H = 도움말 토글
  if (e.key.toLowerCase() === 'h' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    toggleHelpPanel();
    return;
  }

  // 3) Ctrl/Cmd+S = 저장/불러오기 토글
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault(); // 브라우저 페이지 저장 다이얼로그 방지
    toggleSavePanel();
    return;
  }

  // 4) Esc = 열려있는 저장/도움말/퍼즐 선택 패널 닫기
  if (e.key === 'Escape') {
    closePanel(savePanel);
    closePanel(helpPanel);
    closePanel(puzzlePanel);
    closePanel(generatePanel);
    return;
  }

  // 5) 위 패널들이 열려있는 동안은 게임 조작 단축키 차단
  if (isFloatingPanelOpen()) return;

  // 5-1) 타이머가 켜져 있고 아직 "시작"을 누르기 전이면 게임 조작 단축키 차단
  if (boardLocked) return;

  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    renderer.undo();
    return;
  }
  if (e.code === 'ShiftLeft') {
    if (!e.repeat) toggleNoteMode();
    return;
  }
  if (ARROW_DIR[e.key]) {
    e.preventDefault();
    renderer.moveSelection(ARROW_DIR[e.key]);
    return;
  }
  if (e.key >= '1' && e.key <= '9') {
    renderer.inputValue(Number(e.key));
    return;
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    renderer.inputValue(null);
  }
});

// ── WASD 부드러운 게임 판 이동 ──
const PAN_SPEED = 700; // px/sec
const WASD_DIR  = { w: [0, -1], a: [-1, 0], s: [0, 1], d: [1, 0] };
const heldKeys  = new Set();

window.addEventListener('keydown', (e) => {
  if (!isGameActive() || confirmModal.classList.contains('show') || isFloatingPanelOpen()) return;
  const k = e.key.toLowerCase();
  if (WASD_DIR[k]) heldKeys.add(k);
});
window.addEventListener('keyup', (e) => {
  heldKeys.delete(e.key.toLowerCase());
});
window.addEventListener('blur', () => heldKeys.clear());

let lastTick = null;
function panLoop(t) {
  if (lastTick === null) lastTick = t;
  const dt = (t - lastTick) / 1000;
  lastTick = t;

  if (heldKeys.size) {
    let dx = 0, dy = 0;
    for (const k of heldKeys) { dx += WASD_DIR[k][0]; dy += WASD_DIR[k][1]; }
    if (dx || dy) {
      const len = Math.hypot(dx, dy) || 1;
      boardDrag.moveBy((dx / len) * PAN_SPEED * dt, (dy / len) * PAN_SPEED * dt);
    }
  }
  requestAnimationFrame(panLoop);
}
requestAnimationFrame(panLoop);

// ── 완성 토스트 ──
document.addEventListener('sudoku:solved', () => {
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2400);
});
