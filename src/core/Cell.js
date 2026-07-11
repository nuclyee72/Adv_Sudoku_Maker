/**
 * Cell.js — 스도쿠 개별 칸의 데이터 모델
 */
export class Cell {
  constructor(row, col, options = {}) {
    this.row = row;
    this.col = col;
    this.value = options.value ?? null;
    this.isGiven = options.isGiven ?? false;
    this.isVisible = options.isVisible ?? true;
    this.candidates = new Set();
    this.isConflict = false;
    this.isSelected = false;
    this.isHighlighted = false;
  }

  setValue(value) {
    if (this.isGiven) return false;
    this.value = value;
    return true;
  }

  clear() {
    if (this.isGiven) return;
    this.value = null;
    this.candidates.clear();
    this.isConflict = false;
  }
}
