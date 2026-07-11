import { Structure } from '../core/Structure.js';

/**
 * Inequality — 인접한 두 칸(a, b) 사이의 대소 관계 제약 ('부등호' 표시).
 * greater: 'a' | 'b' — 어느 칸의 값이 더 커야 하는지.
 * 두 칸 모두 값이 채워졌을 때만 검증하며, 위반 시 두 칸 모두 충돌(conflict)로 표시된다.
 */
export class Inequality extends Structure {
  constructor(a, b, greater) {
    super('inequality', [a, b]);
    this.a = a;
    this.b = b;
    this.greater = greater;
  }

  validate(board) {
    const cellA = board.getCell(this.a.row, this.a.col);
    const cellB = board.getCell(this.b.row, this.b.col);
    if (!cellA || !cellB || cellA.value === null || cellB.value === null) return [];

    const ok = this.greater === 'a' ? cellA.value > cellB.value : cellB.value > cellA.value;
    if (ok) return [];
    return [{ row: cellA.row, col: cellA.col }, { row: cellB.row, col: cellB.col }];
  }
}
