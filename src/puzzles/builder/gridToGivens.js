/** gridToGivens.js — 2차원 배열(0=빈칸) 형태의 grid를 {row, col, value} givens 배열로 변환한다. */
export function gridToGivens(grid, originRow = 0, originCol = 0) {
  const givens = [];
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid[r].length; c++)
      if (grid[r][c] !== 0) givens.push({ row: originRow + r, col: originCol + c, value: grid[r][c] });
  return givens;
}
