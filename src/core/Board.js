/**
 * Board.js — 스파스 맵 기반 게임판
 */
import { Cell } from './Cell.js';

export class Board {
  constructor() {
    this.cells = new Map();
    this.structures = [];
  }

  getCell(row, col) {
    return this.cells.get(`${row},${col}`) ?? null;
  }

  _getOrCreateCell(row, col) {
    const key = `${row},${col}`;
    if (!this.cells.has(key)) this.cells.set(key, new Cell(row, col));
    return this.cells.get(key);
  }

  setValue(row, col, value) {
    const cell = this.getCell(row, col);
    if (!cell || !cell.isVisible) return false;
    return cell.setValue(value);
  }

  getVisibleCells() {
    return [...this.cells.values()].filter(c => c.isVisible);
  }

  getBounds() {
    if (this.cells.size === 0) return { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 };
    let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity;
    for (const cell of this.cells.values()) {
      if (!cell.isVisible) continue;
      minRow = Math.min(minRow, cell.row); maxRow = Math.max(maxRow, cell.row);
      minCol = Math.min(minCol, cell.col); maxCol = Math.max(maxCol, cell.col);
    }
    return { minRow, maxRow, minCol, maxCol };
  }

  addStructure(structure) {
    for (const { row, col } of structure.coords) this._getOrCreateCell(row, col);
    this.structures.push(structure);
  }

  addStructures(structures) {
    for (const s of structures) this.addStructure(s);
  }

  loadGivens(givens) {
    for (const { row, col, value } of givens) {
      const cell = this.getCell(row, col);
      if (cell && value !== 0) { cell.value = value; cell.isGiven = true; }
    }
  }

  hideCell(row, col) {
    const cell = this.getCell(row, col);
    if (cell) cell.isVisible = false;
  }

  isSolved() {
    const visible = this.getVisibleCells();
    if (visible.length === 0) return false;
    return visible.every(c => c.value !== null && !c.isConflict);
  }

  getPeers(row, col) {
    const peerSet = new Set();
    for (const struct of this.structures) {
      if (!struct.coords.some(c => c.row === row && c.col === col)) continue;
      for (const coord of struct.coords) {
        if (coord.row === row && coord.col === col) continue;
        peerSet.add(`${coord.row},${coord.col}`);
      }
    }
    return [...peerSet].map(key => {
      const [r, c] = key.split(',').map(Number);
      return { row: r, col: c };
    });
  }
}
