import { Structure } from '../core/Structure.js';

/**
 * Snake — 지정된 칸들(형태 무관, 연결되어 있음)에 대해, 지정된 시작 칸에서
 * 출발해 상하좌우로 인접한 칸을 값이 1씩만 차이나게 한 번씩 지나
 * 모든 칸을 방문하는 경로(해밀턴 경로)가 존재해야 하는 제약.
 *
 * validate()는 (다른 구조체용) 텍스트 빨간색·완성 여부 판정을 위해 실제
 * 위반 좌표를 그대로 반환하지만, 화면에 칸별 빨간 사각형으로 표시하는 것은
 * 렌더러 쪽에서 "다른 구조체가 낸 충돌"만 걸러 보여주도록 처리한다 —
 * 스네이크 자체 위반은 영역을 감싸는 외곽선으로 따로 그리기 때문.
 */
export class Snake extends Structure {
  constructor(cells, start) {
    super('snake', cells);
    this.start = start;
  }

  static _adjacent(a, b) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
  }

  /**
   * 시작 칸에서 출발해, 값이 채워진 칸만 따라(인접 + 값 차이 1) 갈 수 있는
   * 가장 긴 경로를 찾아 칸 배열로 반환한다. 시작 칸이 비어 있으면 빈 배열.
   * 모든 칸이 채워져 있고 전체를 다 지나는 경로가 있다면 완성된 경로가 된다.
   */
  longestPathFromStart(board) {
    const cells = this.getCells(board);
    if (cells.length !== this.coords.length) return [];
    const startCell = cells.find(c => c.row === this.start.row && c.col === this.start.col);
    if (!startCell || startCell.value === null) return [];

    const total = cells.length;
    let best = [];
    const visited = new Set();
    const path = [];

    const dfs = (cell) => {
      visited.add(`${cell.row},${cell.col}`);
      path.push(cell);
      if (path.length > best.length) best = [...path];
      if (best.length < total) {
        for (const next of cells) {
          if (best.length >= total) break;
          const key = `${next.row},${next.col}`;
          if (visited.has(key) || next.value === null) continue;
          if (!Snake._adjacent(cell, next)) continue;
          if (Math.abs(next.value - cell.value) !== 1) continue;
          dfs(next);
        }
      }
      visited.delete(`${cell.row},${cell.col}`);
      path.pop();
    };

    dfs(startCell);
    return best;
  }

  validate(board) {
    const cells = this.getCells(board);
    if (cells.length === 0 || cells.some(c => c.value === null)) return [];
    const path = this.longestPathFromStart(board);
    if (path.length === cells.length) return [];
    return cells.map(c => ({ row: c.row, col: c.col }));
  }
}
