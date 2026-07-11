import { Structure } from '../core/Structure.js';

/**
 * Consecutive — 인접한 두 칸(a, b)이 연속된 숫자(차이가 1)여야 하는 제약.
 * 두 칸 모두 값이 채워졌을 때만 검증하며, 위반 시 두 칸 모두 충돌(conflict)로 표시된다.
 */
export class Consecutive extends Structure {
  constructor(a, b) {
    super('consecutive', [a, b]);
    this.a = a;
    this.b = b;
  }

  validate(board) {
    const cellA = board.getCell(this.a.row, this.a.col);
    const cellB = board.getCell(this.b.row, this.b.col);
    if (!cellA || !cellB || cellA.value === null || cellB.value === null) return [];

    if (Math.abs(cellA.value - cellB.value) === 1) return [];
    return [{ row: cellA.row, col: cellA.col }, { row: cellB.row, col: cellB.col }];
  }
}
