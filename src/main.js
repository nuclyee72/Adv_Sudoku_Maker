/**
 * main.js — 진입점, 보드/UI 조립 및 이벤트 바인딩
 */
import { Board } from './core/Board.js';
import { BoardRenderer } from './ui/BoardRenderer.js';
import { DragPanel } from './ui/DragPanel.js';
import { Keypad } from './ui/Keypad.js';
import { PUZZLE_CROSS } from './puzzles/cross.js';

const svg          = document.getElementById('sudoku-svg');
const boardPanel   = document.getElementById('board-panel');
const keypadPanel  = document.getElementById('keypad-panel');
const keypadGrid   = document.getElementById('keypad-grid');
const kpToggle     = document.getElementById('kp-toggle');
const btnResetAll  = document.getElementById('btn-reset-all');
const toast        = document.getElementById('toast');
const confirmModal  = document.getElementById('confirm-modal');
const confirmOk     = document.getElementById('confirm-ok');
const confirmCancel = document.getElementById('confirm-cancel');

// ── 보드 조립 ──
const board = new Board();
board.addStructures(PUZZLE_CROSS.structures);
board.loadGivens(PUZZLE_CROSS.givens);

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

// ── 추가 메뉴 열기/닫기 (본 키패드는 그대로 두고, 왼쪽에 별도 메뉴가 펼쳐짐) ──
kpToggle.addEventListener('click', () => {
  const open = keypadPanel.classList.toggle('menu-open');
  kpToggle.textContent = open ? '›' : '‹';
});

// ── 모두 지우기 (확인 모달) ──
function openConfirmModal() {
  confirmModal.classList.add('show');
}
function closeConfirmModal() {
  confirmModal.classList.remove('show');
}

btnResetAll.addEventListener('click', () => {
  btnResetAll.classList.add('pressed');
  setTimeout(() => btnResetAll.classList.remove('pressed'), 130);
  openConfirmModal();
});

confirmOk.addEventListener('click', () => {
  renderer.resetBoard();
  closeConfirmModal();
});

confirmCancel.addEventListener('click', closeConfirmModal);

confirmModal.addEventListener('click', (e) => {
  if (e.target === confirmModal) closeConfirmModal(); // 배경 클릭 시 취소
});

window.addEventListener('keydown', (e) => {
  if (confirmModal.classList.contains('show')) {
    if (e.key === 'Escape') closeConfirmModal();
    else if (e.key === 'Enter') { renderer.resetBoard(); closeConfirmModal(); }
  }
});

renderer.setupWheel(boardPanel); // 마우스 커서 기준 부드러운 휠 줌

// ── 메모 모드 (Lshift 또는 메모 버튼으로 토글) ──
function toggleNoteMode() {
  renderer.noteMode = !renderer.noteMode;
  keypad.setNoteMode(renderer.noteMode);
}

// ── 키패드 ──
const keypad = new Keypad(keypadGrid, (value) => renderer.inputValue(value), toggleNoteMode);

renderer.onCellSelect = (row, col) => {
  const cell = board.getCell(row, col);
  keypad.highlightValue(cell?.value ?? null);
};

renderer.selectFirstCell();

// ── 숫자 키 / 방향키 입력 ──
const ARROW_DIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

window.addEventListener('keydown', (e) => {
  if (confirmModal.classList.contains('show')) return; // 모달이 떠 있는 동안은 보드 입력 차단

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
  if (confirmModal.classList.contains('show')) return;
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
