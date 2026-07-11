/**
 * Structure.js — 스도쿠 구조체 추상 클래스
 */
export class Structure {
  constructor(type, coords) {
    this.type = type;
    this.coords = coords;
  }

  getCells(board) {
    return this.coords
      .map(({ row, col }) => board.getCell(row, col))
      .filter(cell => cell !== null && cell.isVisible);
  }

  validate(board) {
    const cells = this.getCells(board);
    const valueMap = new Map();
    for (const cell of cells) {
      if (cell.value === null) continue;
      if (!valueMap.has(cell.value)) valueMap.set(cell.value, []);
      valueMap.get(cell.value).push({ row: cell.row, col: cell.col });
    }
    const conflicts = [];
    for (const [, coords] of valueMap) {
      if (coords.length > 1) conflicts.push(...coords);
    }
    return conflicts;
  }
}
