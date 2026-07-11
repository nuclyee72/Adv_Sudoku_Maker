/**
 * BoardRenderer.js — SVG 기반 스도쿠 게임판 렌더링
 * - 마우스 커서 기준 휠 줌
 * - boardDrag 참조를 통해 드래그 중 셀 클릭 억제
 */
import { Validator } from '../core/Validator.js';

const CELL       = 56;
const PAD        = 8;
const THIN       = 1;
const THICK      = 3;
const GRID_THICK = 6; // 9x9 판 전체 테두리 — 3x3 박스 테두리(THICK)보다 두껍게

export class BoardRenderer {
  /**
   * @param {SVGElement} svgEl
   * @param {import('../core/Board.js').Board} board
   */
  constructor(svgEl, board) {
    this.svg   = svgEl;
    this.board = board;
    this.selectedCell = null;
    this.scale = 1;
    this.onCellSelect = null;
    this.noteMode = false; // true면 숫자 입력이 실제 값이 아닌 메모(후보 숫자)로 기록됨

    /** 실행 취소 스택 — 각 항목은 [{row, col, prevValue, prevCandidates}, ...] */
    this._undoStack = [];

    /** boardDrag 참조 — 드래그 후 클릭 억제에 사용 */
    this.boardDrag = null;

    this._els    = new Map(); // "r,c" → {rect, text, conflictRect}
    this._minRow = 0;
    this._minCol = 0;

    this.render();
  }

  // ── 좌표 변환 ──
  _px(col) { return PAD + (col - this._minCol) * CELL; }
  _py(row) { return PAD + (row - this._minRow) * CELL; }

  // ── 전체 렌더 ──
  render() {
    const { minRow, maxRow, minCol, maxCol } = this.board.getBounds();
    this._minRow = minRow;
    this._minCol = minCol;

    const W = (maxCol - minCol + 1) * CELL + PAD * 2;
    const H = (maxRow - minRow + 1) * CELL + PAD * 2;

    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.setAttribute('width',  W);
    this.svg.setAttribute('height', H);

    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);
    this._els.clear();

    this._gConflicts = this._g('g-conflicts');

    this._drawCells();
    this._drawThinLines();
    this._drawBoxBorders();
    this._drawGridBorders();

    // 에러 테두리를 위로, 부등호 표시는 그보다 더 위로 오도록 순서대로 삽입
    this.svg.appendChild(this._gConflicts);
    this._drawInequalities();

    Validator.validate(this.board);
    this._updateAll();
  }

  // ── 셀 배경 + 텍스트 ──
  _drawCells() {
    const g = this._g('g-cells');
    for (const cell of this.board.getVisibleCells()) {
      const x = this._px(cell.col), y = this._py(cell.row);

      const rect = this._el('rect');
      rect.setAttribute('x', x);           rect.setAttribute('y', y);
      rect.setAttribute('width',  CELL);   rect.setAttribute('height', CELL);
      rect.setAttribute('rx', '3');
      rect.setAttribute('fill', 'var(--cell-bg)');
      rect.style.cursor = 'pointer';
      rect.addEventListener('click', () => this._onClick(cell.row, cell.col));

      const text = this._el('text');
      text.setAttribute('x', x + CELL / 2);
      text.setAttribute('y', y + CELL / 2 + 1);
      text.setAttribute('text-anchor',       'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('font-size',   Math.floor(CELL * 0.48));
      text.setAttribute('font-family', 'Outfit, Inter, sans-serif');
      text.setAttribute('pointer-events', 'none');
      text.style.userSelect = 'none';

      g.appendChild(rect);
      g.appendChild(text);

      // ── 메모(후보 숫자) — 셀을 1~9 위치(123/456/789)로 나눈 작은 숫자 ──
      const notesGroup = this._el('g');
      notesGroup.setAttribute('class', 'cell-notes');
      notesGroup.setAttribute('pointer-events', 'none');
      const noteTexts = [];
      for (let i = 1; i <= 9; i++) {
        const nr = Math.floor((i - 1) / 3), nc = (i - 1) % 3;
        const nt = this._el('text');
        nt.setAttribute('x', x + (nc + 0.5) * (CELL / 3));
        nt.setAttribute('y', y + (nr + 0.5) * (CELL / 3) + 1);
        nt.setAttribute('text-anchor',       'middle');
        nt.setAttribute('dominant-baseline', 'central');
        nt.setAttribute('font-size',   Math.floor(CELL / 3 * 0.68));
        nt.setAttribute('font-family', 'Outfit, Inter, sans-serif');
        nt.setAttribute('fill', 'var(--text-note)');
        notesGroup.appendChild(nt);
        noteTexts.push(nt);
      }
      g.appendChild(notesGroup);

      const conflictRect = this._el('rect');
      conflictRect.setAttribute('x', x);           conflictRect.setAttribute('y', y);
      conflictRect.setAttribute('width',  CELL);   conflictRect.setAttribute('height', CELL);
      conflictRect.setAttribute('rx', '3');
      conflictRect.setAttribute('fill', 'none');
      conflictRect.setAttribute('stroke', 'var(--conflict)');
      conflictRect.setAttribute('stroke-width', GRID_THICK);
      conflictRect.setAttribute('pointer-events', 'none');
      conflictRect.setAttribute('display', 'none');
      this._gConflicts.appendChild(conflictRect);

      this._els.set(`${cell.row},${cell.col}`, { rect, text, conflictRect, notesGroup, noteTexts });
    }
    this.svg.appendChild(g);
  }

  // ── 얇은 선 (인접 셀 경계) ──
  _drawThinLines() {
    const g   = this._g('g-thin');
    const vis = new Set(this.board.getVisibleCells().map(c => `${c.row},${c.col}`));
    for (const cell of this.board.getVisibleCells()) {
      const x = this._px(cell.col), y = this._py(cell.row);
      if (vis.has(`${cell.row},${cell.col + 1}`))
        g.appendChild(this._line(x+CELL, y, x+CELL, y+CELL, THIN, 'var(--grid-line)'));
      if (vis.has(`${cell.row + 1},${cell.col}`))
        g.appendChild(this._line(x, y+CELL, x+CELL, y+CELL, THIN, 'var(--grid-line)'));
    }
    this.svg.appendChild(g);
  }

  // ── 두꺼운 박스 경계선 ──
  _drawBoxBorders() {
    const g = this._g('g-boxes');
    for (const s of this.board.structures.filter(s => s.type === 'box3x3')) {
      const x = this._px(s.originCol), y = this._py(s.originRow);
      const r = this._el('rect');
      r.setAttribute('x', x);             r.setAttribute('y', y);
      r.setAttribute('width',  CELL * 3); r.setAttribute('height', CELL * 3);
      r.setAttribute('fill',         'none');
      r.setAttribute('stroke',       'var(--box-line)');
      r.setAttribute('stroke-width', THICK);
      r.setAttribute('rx', '4');
      g.appendChild(r);
    }
    this.svg.appendChild(g);
  }

  // ── 더 두꺼운 9x9 판 전체 경계선 (3x3 박스 경계선보다 두껍게) ──
  _drawGridBorders() {
    const g = this._g('g-grids');
    for (const s of this.board.structures.filter(s => s.type === 'grid9x9')) {
      const x = this._px(s.originCol), y = this._py(s.originRow);
      const r = this._el('rect');
      r.setAttribute('x', x);             r.setAttribute('y', y);
      r.setAttribute('width',  CELL * 9); r.setAttribute('height', CELL * 9);
      r.setAttribute('fill',         'none');
      r.setAttribute('stroke',       'var(--box-line)');
      r.setAttribute('stroke-width', GRID_THICK);
      r.setAttribute('rx', '5');
      g.appendChild(r);
    }
    this.svg.appendChild(g);
  }

  // ── 부등호 표시 (인접한 두 칸 사이, 더 작은 값 쪽을 뾰족한 끝이 가리킴) ──
  _drawInequalities() {
    const g = this._g('g-inequalities');
    const vis = new Set(this.board.getVisibleCells().map(c => `${c.row},${c.col}`));
    for (const s of this.board.structures.filter(s => s.type === 'inequality')) {
      const { a, b, greater } = s;
      if (!vis.has(`${a.row},${a.col}`) || !vis.has(`${b.row},${b.col}`)) continue;

      const ax = this._px(a.col) + CELL / 2, ay = this._py(a.row) + CELL / 2;
      const bx = this._px(b.col) + CELL / 2, by = this._py(b.row) + CELL / 2;
      const mx = (ax + bx) / 2, my = (ay + by) / 2;

      // 더 작은 값을 가져야 하는 칸 쪽으로 쐐기 끝이 향하도록 회전각 계산
      const smallerX = greater === 'a' ? bx : ax;
      const smallerY = greater === 'a' ? by : ay;
      const angle = Math.atan2(smallerY - my, smallerX - mx) * 180 / Math.PI;

      const chevron = this._el('polyline');
      const w = 7, h = 6; // 로컬 좌표: 기본적으로 -X(왼쪽)를 가리키는 꺾인 부등호 모양
      chevron.setAttribute('points', `${w},${-h} ${-w},0 ${w},${h}`);
      chevron.setAttribute('transform', `translate(${mx},${my}) rotate(${angle - 180})`);
      chevron.setAttribute('fill', 'none');
      chevron.setAttribute('stroke', 'var(--ineq-mark)');
      chevron.setAttribute('stroke-width', '2.5');
      chevron.setAttribute('stroke-linecap', 'round');
      chevron.setAttribute('stroke-linejoin', 'round');
      chevron.setAttribute('pointer-events', 'none');
      g.appendChild(chevron);
    }
    this.svg.appendChild(g);
  }

  // ── 상태 업데이트 ──
  _updateAll() {
    for (const [key] of this._els) {
      if (key === 'g-conflicts') continue;
      const [r, c] = key.split(',').map(Number);
      this._updateCell(r, c);
    }
  }

  _updateCell(row, col) {
    const el   = this._els.get(`${row},${col}`);
    const cell = this.board.getCell(row, col);
    if (!el || !cell) return;
    const { rect, text, conflictRect, noteTexts } = el;
    const sel = this.selectedCell?.row === row && this.selectedCell?.col === col;

    rect.setAttribute('fill',
      sel               ? 'var(--cell-selected)'    :
      cell.isHighlighted ? 'var(--cell-highlighted)' :
      cell.isGiven      ? 'var(--cell-given-bg)'    :
                          'var(--cell-bg)');

    // 빨간 테두리 최상단 배치
    if (cell.isConflict) {
      conflictRect.setAttribute('display', 'block');
    } else {
      conflictRect.setAttribute('display', 'none');
    }

    if (cell.value !== null) {
      text.textContent = cell.value;
      text.setAttribute('fill',
        cell.isConflict ? 'var(--conflict)'  :
        sel             ? 'var(--text-sel)'   :
        cell.isGiven    ? 'var(--text-given)' :
                          'var(--text-input)');
      text.setAttribute('font-weight', cell.isGiven ? '700' : '500');
      for (const nt of noteTexts) nt.textContent = '';
    } else {
      text.textContent = '';
      for (let i = 1; i <= 9; i++) {
        noteTexts[i - 1].textContent = cell.candidates.has(i) ? String(i) : '';
      }
    }
  }

  /** 메모에 없는 숫자를 일반 입력 모드에서 입력하려 할 때, 기존 메모를 짧게 빨간색으로 점멸 */
  _flashNoteReject(row, col) {
    const el = this._els.get(`${row},${col}`);
    if (!el) return;
    el.notesGroup.classList.remove('flash-reject');
    void el.notesGroup.getBoundingClientRect(); // 애니메이션 재시작을 위한 강제 리플로우
    el.notesGroup.classList.add('flash-reject');
    setTimeout(() => el.notesGroup.classList.remove('flash-reject'), 500);
  }

  // ── 셀 클릭 ──
  _onClick(row, col) {
    if (this.boardDrag?.wasDragging()) return;
    this.selectCell(row, col);
    if (this.onCellSelect) this.onCellSelect(row, col);
  }

  selectCell(row, col) {
    const cell = this.board.getCell(row, col);
    if (!cell?.isVisible) return;

    for (const c of this.board.getVisibleCells()) c.isHighlighted = false;
    this.selectedCell = { row, col };

    // 클릭한 셀이 속한 9x9 판 필터링
    const activeGrids = this.board.structures.filter(s => 
      s.type === 'grid9x9' && 
      row >= s.originRow && row < s.originRow + 9 && 
      col >= s.originCol && col < s.originCol + 9
    );

    // 같은 숫자 하이라이트 (관련된 9x9 안에 있는 것만)
    if (cell.value !== null) {
      for (const c of this.board.getVisibleCells()) {
        if (c.value === cell.value && !(c.row === row && c.col === col)) {
          const inGrid = activeGrids.some(s => 
            c.row >= s.originRow && c.row < s.originRow + 9 && 
            c.col >= s.originCol && c.col < s.originCol + 9
          );
          if (inGrid) c.isHighlighted = true;
        }
      }
    }

    // 같은 줄, 3x3 박스 하이라이트 복원
    for (const { row: pr, col: pc } of this.board.getPeers(row, col)) {
      const p = this.board.getCell(pr, pc);
      if (p) p.isHighlighted = true;
    }

    this._updateAll();
  }

  inputValue(value) {
    if (!this.selectedCell) return;
    const { row, col } = this.selectedCell;
    const cell = this.board.getCell(row, col);
    if (!cell || cell.isGiven) return;

    // ── 지우기: 모드 상관없이 값 + 메모 모두 제거 ──
    if (value === null) {
      const prevValue = cell.value;
      const prevCandidates = [...cell.candidates];
      if (prevValue === null && prevCandidates.length === 0) return; // 지울 게 없으면 변화 없음
      cell.value = null;
      cell.candidates.clear();
      this._pushUndo([{ row, col, prevValue, prevCandidates }]);
      Validator.validate(this.board);
      this.selectCell(row, col);
      if (this.onCellSelect) this.onCellSelect(row, col);
      return;
    }

    // ── 메모 모드: 실제 값이 아니라 후보 숫자(작은 숫자)를 토글 ──
    if (this.noteMode) {
      if (cell.value !== null) return; // 이미 값이 있는 칸엔 메모 불가
      const prevCandidates = [...cell.candidates];
      if (cell.candidates.has(value)) cell.candidates.delete(value);
      else cell.candidates.add(value);
      this._pushUndo([{ row, col, prevValue: cell.value, prevCandidates }]);
      this._updateCell(row, col);
      if (this.onCellSelect) this.onCellSelect(row, col);
      return;
    }

    // ── 일반 입력 모드: 메모가 있는 칸엔 메모된 숫자만 입력 가능 ──
    if (cell.candidates.size > 0 && !cell.candidates.has(value)) {
      this._flashNoteReject(row, col);
      return;
    }

    const prevValue = cell.value;
    const prevCandidates = [...cell.candidates];
    this.board.setValue(row, col, value);
    cell.candidates.clear();
    this._pushUndo([{ row, col, prevValue, prevCandidates }]);
    Validator.validate(this.board);
    this.selectCell(row, col);
    if (this.onCellSelect) this.onCellSelect(row, col);
    if (this.board.isSolved()) {
      setTimeout(() => {
        this._celebrate();
        document.dispatchEvent(new CustomEvent('sudoku:solved'));
      }, 80);
    }
  }

  /** 기입한 값(초기 제공 숫자 제외) + 메모 전부 지우기 */
  resetBoard() {
    const changes = [];
    for (const cell of this.board.getVisibleCells()) {
      if (cell.isGiven) continue;
      if (cell.value === null && cell.candidates.size === 0) continue;
      changes.push({ row: cell.row, col: cell.col, prevValue: cell.value, prevCandidates: [...cell.candidates] });
      cell.clear();
    }
    if (changes.length) this._pushUndo(changes);
    Validator.validate(this.board);
    if (this.selectedCell) this.selectCell(this.selectedCell.row, this.selectedCell.col);
    else this._updateAll();
    if (this.onCellSelect && this.selectedCell) {
      this.onCellSelect(this.selectedCell.row, this.selectedCell.col);
    }
  }

  _pushUndo(changes) {
    this._undoStack.push(changes);
  }

  /** 퍼즐 교체 등으로 board 인스턴스 자체를 새로 갈아끼울 때 사용 — 처음부터 다시 그림 */
  loadBoard(newBoard) {
    this.board = newBoard;
    this.selectedCell = null;
    this._undoStack = [];
    this.render();
  }

  /** board 데이터가 외부에서 통째로 교체됐을 때(불러오기 등) 다시 그림 */
  refresh() {
    this._undoStack = []; // 불러온 상태를 새 기준점으로 삼음
    Validator.validate(this.board);
    if (this.selectedCell) this.selectCell(this.selectedCell.row, this.selectedCell.col);
    else this._updateAll();
    if (this.onCellSelect && this.selectedCell) {
      this.onCellSelect(this.selectedCell.row, this.selectedCell.col);
    }
  }

  /** 실행 취소 (Ctrl+Z) — 되돌릴 수 있는 횟수는 메모리가 허용하는 한 무제한 */
  undo() {
    const entry = this._undoStack.pop();
    if (!entry) return;
    for (const { row, col, prevValue, prevCandidates } of entry) {
      const cell = this.board.getCell(row, col);
      if (!cell) continue;
      cell.value = prevValue;
      cell.candidates = new Set(prevCandidates);
    }
    Validator.validate(this.board);
    if (this.selectedCell) this.selectCell(this.selectedCell.row, this.selectedCell.col);
    else this._updateAll();
    if (this.onCellSelect && this.selectedCell) {
      this.onCellSelect(this.selectedCell.row, this.selectedCell.col);
    }
  }

  moveSelection(dir) {
    if (!this.selectedCell) { this.selectFirstCell(); return; }
    const { row, col } = this.selectedCell;
    const d = { up:[-1,0], down:[1,0], left:[0,-1], right:[0,1] }[dir];
    const { minRow, maxRow, minCol, maxCol } = this.board.getBounds();
    let r = row + d[0], c = col + d[1];
    while (r >= minRow-1 && r <= maxRow+1 && c >= minCol-1 && c <= maxCol+1) {
      const next = this.board.getCell(r, c);
      if (next?.isVisible) {
        this.selectCell(r, c);
        if (this.onCellSelect) this.onCellSelect(r, c);
        return;
      }
      r += d[0]; c += d[1];
    }
  }

  selectFirstCell() {
    const cells = this.board.getVisibleCells()
      .sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);
    if (cells[0]) {
      this.selectCell(cells[0].row, cells[0].col);
      if (this.onCellSelect) this.onCellSelect(cells[0].row, cells[0].col);
    }
  }

  /**
   * 확대 배율을 적용하고, wrapper(svg.parentElement)의 레이아웃 크기를
   * 실제 시각적 크기에 맞춰 동기화한다.
   * CSS transform은 자식의 레이아웃 박스 크기를 바꾸지 않으므로, 동기화하지
   * 않으면 wrapper가 축소 전 원본 크기 그대로 화면 대부분을 뒤덮는
   * 보이지 않는 히트박스로 남아 다른 패널의 클릭을 가로채게 된다.
   */
  setScale(newScale) {
    this.scale = newScale;
    this.svg.style.transform = `scale(${newScale})`;

    const wrapper = this.svg.parentElement;
    if (wrapper) {
      const naturalW = parseFloat(this.svg.getAttribute('width'))  || 0;
      const naturalH = parseFloat(this.svg.getAttribute('height')) || 0;
      wrapper.style.width  = `${naturalW * newScale}px`;
      wrapper.style.height = `${naturalH * newScale}px`;
    }
  }

  /**
   * 마우스 커서 기준 부드러운 휠 줌
   * @param {HTMLElement} boardPanel
   */
  setupWheel(boardPanel) {
    const wrapper = this.svg.parentElement;
    if (!wrapper) return;

    let targetScale  = this.scale;
    let curLogX      = 0, curLogY = 0;
    let mouseX       = 0, mouseY  = 0;
    let rafId        = null;

    const LERP = 0.18;

    const tick = () => {
      const diff = targetScale - this.scale;

      if (Math.abs(diff) < 0.0003) {
        applyZoom(targetScale);
        rafId = null;
        return;
      }

      const newScale = this.scale + diff * LERP;
      applyZoom(newScale);
      rafId = requestAnimationFrame(tick);
    };

    const applyZoom = (newScale) => {
      this.setScale(newScale);

      const nx = mouseX - curLogX * newScale;
      const ny = mouseY - curLogY * newScale;
      const MIN_VIS = 56;
      const r = this.svg.getBoundingClientRect();
      const pw = r.width;
      const ph = r.height;
      boardPanel.style.left = `${Math.max(-(pw - MIN_VIS), Math.min(nx, window.innerWidth  - MIN_VIS))}px`;
      boardPanel.style.top  = `${Math.max(-(ph - MIN_VIS), Math.min(ny, window.innerHeight - MIN_VIS))}px`;
    };

    wrapper.addEventListener('wheel', (e) => {
      e.preventDefault();

      mouseX = e.clientX;
      mouseY = e.clientY;

      const panelLeft = parseFloat(boardPanel.style.left) || 0;
      const panelTop  = parseFloat(boardPanel.style.top)  || 0;

      curLogX = (mouseX - panelLeft) / this.scale;
      curLogY = (mouseY - panelTop)  / this.scale;

      const delta = e.deltaY * (e.deltaMode === 1 ? 30 : e.deltaMode === 2 ? 900 : 1);
      const factor = Math.pow(0.999, delta);
      targetScale = Math.max(0.2, Math.min(6, targetScale * factor));

      if (!rafId) rafId = requestAnimationFrame(tick);
    }, { passive: false });
  }

  _celebrate() {
    for (const [, { rect }] of this._els) {
      if(rect) {
        rect.classList.add('cell-win');
        setTimeout(() => rect.classList.remove('cell-win'), 1000);
      }
    }
  }

  // ── SVG 유틸 ──
  _el(tag) { return document.createElementNS('http://www.w3.org/2000/svg', tag); }
  _g(id)   { const g = this._el('g'); g.id = id; return g; }
  _line(x1, y1, x2, y2, w, stroke) {
    const l = this._el('line');
    l.setAttribute('x1', x1); l.setAttribute('y1', y1);
    l.setAttribute('x2', x2); l.setAttribute('y2', y2);
    l.setAttribute('stroke',       stroke);
    l.setAttribute('stroke-width', w);
    l.setAttribute('stroke-linecap', 'square');
    return l;
  }
}
