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
function loadPuzzle(puzzle) {
  board = new Board();
  board.addStructures(puzzle.structures);
  board.loadGivens(puzzle.givens);
  renderer.loadBoard(board);
  fitAndCenterBoard();
  renderer.selectFirstCell();
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
  if (confirmModal.classList.contains('show') || isFloatingPanelOpen()) return;
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
