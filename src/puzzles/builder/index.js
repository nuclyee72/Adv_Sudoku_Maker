/**
 * index.js — 퍼즐 동작에 필요한 공통 로직
 *
 * stages/ 폴더의 데이터(기본 정보 + 요소)만 담은 스테이지 정의를
 * 실제 플레이 가능한 퍼즐 객체({id, name, structures, givens})로 조립한다.
 * 새 퍼즐을 추가할 땐 이 폴더를 건드릴 필요 없이 stages/에 데이터만 추가하면 된다.
 * 새 규칙 종류를 추가할 땐 이 폴더에 파일 하나(예: xxx.js의 buildXxx(stage))를 추가하고
 * 아래 buildPuzzle()에서 이어붙이면 된다 — stages/가 STAGES 배열에 파일을 추가하는 것과 같은 패턴.
 */
import { buildBoardStructures } from './boards.js';
import { gridToGivens } from './gridToGivens.js';
import { buildInequalities } from './inequality.js';
import { buildConsecutives } from './consecutive.js';
import { buildSnakes } from './snake.js';
import { buildTurntables } from './turntable.js';

export { dedupStructures } from './dedupStructures.js';
export { gridToGivens } from './gridToGivens.js';

/**
 * stage: {
 *   id, name,
 *   boards: [{ row, col }, ...],  // 9x9 표준 스도쿠 판들의 원점 좌표 (겹치면 자동으로 구조체 중복 제거)
 *   givens?: [{ row, col, value }, ...],
 *   grid?: number[][],            // 단일 판일 때 givens 대신 사용 가능 (boards[0] 기준으로 변환)
 *   inequalities?: [{ a: {row,col}, b: {row,col}, greater: 'a'|'b' }, ...], // 부등호 표시 (인접한 두 칸)
 *   consecutives?: [{ a: {row,col}, b: {row,col} }, ...],                  // 연속 표시 (인접한 두 칸, 값 차이 1)
 *   snakes?: [{ cells: [{row,col}, ...], start: {row,col} }, ...],         // 스네이크 (지정 칸들 + 시작점, 해밀턴 경로 제약)
 *   turntables?: [{ originRow, originCol, size }, ...],                    // 턴테이블 (n x n 회전 가능 영역)
 *   (박스 경계를 넘는 좌표 쌍/영역도 그대로 지원됨 — 구조체가 좌표만으로 동작하고 3x3 소속과 무관함)
 * }
 */
export function buildPuzzle(stage) {
  const structures = [
    ...buildBoardStructures(stage),
    ...buildInequalities(stage),
    ...buildConsecutives(stage),
    ...buildSnakes(stage),
    ...buildTurntables(stage),
  ];

  const givens = stage.grid
    ? gridToGivens(stage.grid, stage.boards[0].row, stage.boards[0].col)
    : stage.givens;

  return { id: stage.id, name: stage.name, structures, givens };
}
