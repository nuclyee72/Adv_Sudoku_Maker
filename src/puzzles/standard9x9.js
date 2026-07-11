import { createStandardSudokuStructures } from '../structures/StandardSudoku.js';

const GRID = [
  [5,3,0,0,7,0,0,0,0],
  [6,0,0,1,9,5,0,0,0],
  [0,9,8,0,0,0,0,6,0],
  [8,0,0,0,6,0,0,0,3],
  [4,0,0,8,0,3,0,0,1],
  [7,0,0,0,2,0,0,0,6],
  [0,6,0,0,0,0,2,8,0],
  [0,0,0,4,1,9,0,0,5],
  [0,0,0,0,8,0,0,7,9],
];

function gridToGivens(grid, originRow = 0, originCol = 0) {
  const givens = [];
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid[r].length; c++)
      if (grid[r][c] !== 0) givens.push({ row: originRow + r, col: originCol + c, value: grid[r][c] });
  return givens;
}

export const PUZZLE_SINGLE = {
  id: 'single-001',
  name: '기본 9×9 스도쿠',
  structures: createStandardSudokuStructures(0, 0),
  givens: gridToGivens(GRID),
};
