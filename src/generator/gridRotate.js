/**
 * gridRotate.js — 순수 배열 기반 n x n 회전(시계방향 90도 x times).
 * src/structures/Turntable.js의 rotate() 공식과 동일하지만, 실제 Cell을 건드리지 않고
 * 생성기가 후보 배치를 시험해 볼 때 쓰는 순수 함수 버전.
 */
export function rotateGrid(grid, times) {
  const n = grid.length;
  const norm = ((times % 4) + 4) % 4;
  let src = grid;
  for (let k = 0; k < norm; k++) {
    const next = Array.from({ length: n }, () => new Array(n));
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        next[c][n - 1 - r] = src[r][c];
    src = next;
  }
  return src;
}
