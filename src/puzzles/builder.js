/**
 * builder.js — 퍼즐 동작에 필요한 공통 로직
 *
 * stages/ 폴더의 데이터(기본 정보 + 요소)만 담은 스테이지 정의를
 * 실제 플레이 가능한 퍼즐 객체({id, name, structures, givens})로 조립한다.
 * 새 퍼즐을 추가할 땐 이 파일을 건드릴 필요 없이 stages/에 데이터만 추가하면 된다.
 */
import { createStandardSudokuStructures } from '../structures/StandardSudoku.js';
import { Inequality } from '../structures/Inequality.js';
import { Consecutive } from '../structures/Consecutive.js';
import { Snake } from '../structures/Snake.js';

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
 *   inequalities?: [{ a: {row,col}, b: {row,col}, greater: 'a'|'b' }, ...], // 부등호 표시 (인접한 두 칸)
 *   consecutives?: [{ a: {row,col}, b: {row,col} }, ...],                  // 연속 표시 (인접한 두 칸, 값 차이 1)
 *   snakes?: [{ cells: [{row,col}, ...], start: {row,col} }, ...],         // 스네이크 (지정 칸들 + 시작점, 해밀턴 경로 제약)
 *   (박스 경계를 넘는 좌표 쌍/영역도 그대로 지원됨 — 구조체가 좌표만으로 동작하고 3x3 소속과 무관함)
 * }
 */
export function buildPuzzle(stage) {
  const structures = dedupStructures(
    stage.boards.flatMap(({ row, col }) => createStandardSudokuStructures(row, col))
  );
  for (const { a, b, greater } of stage.inequalities ?? []) {
    structures.push(new Inequality(a, b, greater));
  }
  for (const { a, b } of stage.consecutives ?? []) {
    structures.push(new Consecutive(a, b));
  }
  for (const { cells, start } of stage.snakes ?? []) {
    structures.push(new Snake(cells, start));
  }
  const givens = stage.grid
    ? gridToGivens(stage.grid, stage.boards[0].row, stage.boards[0].col)
    : stage.givens;

  return { id: stage.id, name: stage.name, structures, givens };
}
