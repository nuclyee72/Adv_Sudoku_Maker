/** boards.js — stage.boards(9x9 판 원점 목록)를 겹침 중복 제거까지 마친 구조체 배열로 만든다. */
import { createStandardSudokuStructures } from '../../structures/StandardSudoku.js';
import { dedupStructures } from './dedupStructures.js';

export function buildBoardStructures(stage) {
  return dedupStructures(
    stage.boards.flatMap(({ row, col }) => createStandardSudokuStructures(row, col))
  );
}
