import { Structure } from '../core/Structure.js';

/**
 * Turntable — n x n(n>1) 영역. 플레이어가 손잡이를 드래그해 90도 단위로
 * 돌릴 수 있고, 돌리면 그 안의 칸들(값/초기 제공 여부/메모)이 함께 회전 이동한다.
 * 자체 규칙(validate)은 없음 — 순수한 상호작용 메커니즘.
 */
export class Turntable extends Structure {
  constructor(originRow, originCol, size) {
    const coords = [];
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        coords.push({ row: originRow + r, col: originCol + c });
    super('turntable', coords);
    this.originRow = originRow;
    this.originCol = originCol;
    this.size = size;
  }

  validate() {
    return [];
  }

  /**
   * steps(90도 단위, 양수 = 시계방향)만큼 돌려서 칸의 값/초기제공 여부/메모를
   * 함께 이동시킨다. 되돌리기(undo)에 쓸 수 있도록 회전 전 상태를
   * {row, col, prevValue, prevCandidates, prevIsGiven} 배열로 반환한다.
   */
  rotate(board, steps) {
    const n = this.size;
    const norm = ((steps % 4) + 4) % 4;
    if (norm === 0) return [];

    const grid = [];
    const changes = [];
    for (let r = 0; r < n; r++) {
      grid.push([]);
      for (let c = 0; c < n; c++) {
        const cell = board.getCell(this.originRow + r, this.originCol + c);
        // filledBy는 협동 모드 서버가 Cell 인스턴스에 얹어두는 부가 필드(core는 원래 모름) -
        // 값/메모와 마찬가지로 칸의 내용물이므로 회전할 때 같이 옮겨줘야 "누가 채웠는지" 표시가 안 어긋난다.
        grid[r].push({ value: cell.value, isGiven: cell.isGiven, candidates: new Set(cell.candidates), filledBy: cell.filledBy });
        changes.push({
          row: cell.row, col: cell.col,
          prevValue: cell.value, prevCandidates: [...cell.candidates], prevIsGiven: cell.isGiven,
        });
      }
    }

    // 시계방향 90도: new[c][n-1-r] = old[r][c]. norm번 반복 적용.
    let src = grid;
    for (let k = 0; k < norm; k++) {
      const next = Array.from({ length: n }, () => new Array(n));
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++)
          next[c][n - 1 - r] = src[r][c];
      src = next;
    }

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const cell = board.getCell(this.originRow + r, this.originCol + c);
        const s = src[r][c];
        cell.value = s.value;
        cell.isGiven = s.isGiven;
        cell.candidates = s.candidates;
        cell.filledBy = s.filledBy;
      }
    }

    return changes;
  }
}
