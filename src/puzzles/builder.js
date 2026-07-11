/**
 * builder.js — 퍼즐 동작에 필요한 공통 로직
 *
 * stages/ 폴더의 데이터(기본 정보 + 요소)만 담은 스테이지 정의를
 * 실제 플레이 가능한 퍼즐 객체({id, name, structures, givens})로 조립한다.
 * 새 퍼즐을 추가할 땐 이 파일을 건드릴 필요 없이 stages/에 데이터만 추가하면 된다.
 */
import { createStandardSudokuStructures } from '../structures/StandardSudoku.js';

// 여러 9x9 판이 겹칠 때 공유되는 구조체(줄/박스/전체테두리)를 중복 없이 하나로 합친다.
function dedupStructures(structuresList) {
  const structMap = new Map();
  structuresList.forEach(s => {
    const coordsKey = s.coords.map(c => `${c.row},${c.col}`).join('|');
    const key = `${s.type}-${s.originRow}-${s.originCol}-${coordsKey}`;
    if (!structMap.has(key)) structMap.set(key, s);
  });
  return Array.from(structMap.values());
}

// 2차원 배열(0=빈칸) 형태의 grid를 {row, col, value} givens 배열로 변환한다.
export function gridToGivens(grid, originRow = 0, originCol = 0) {
  const givens = [];
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid[r].length; c++)
      if (grid[r][c] !== 0) givens.push({ row: originRow + r, col: originCol + c, value: grid[r][c] });
  return givens;
}

/**
 * stage: {
 *   id, name,
 *   boards: [{ row, col }, ...],  // 9x9 표준 스도쿠 판들의 원점 좌표 (겹치면 자동으로 구조체 중복 제거)
 *   givens?: [{ row, col, value }, ...],
 *   grid?: number[][],            // 단일 판일 때 givens 대신 사용 가능 (boards[0] 기준으로 변환)
 * }
 */
export function buildPuzzle(stage) {
  const structures = dedupStructures(
    stage.boards.flatMap(({ row, col }) => createStandardSudokuStructures(row, col))
  );
  const givens = stage.grid
    ? gridToGivens(stage.grid, stage.boards[0].row, stage.boards[0].col)
    : stage.givens;

  return { id: stage.id, name: stage.name, structures, givens };
}
