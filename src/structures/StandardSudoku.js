import { Box3x3 } from './Box3x3.js';
import { Row } from './Row.js';
import { Col } from './Col.js';

export function createStandardSudokuStructures(originRow, originCol) {
  const structures = [];
  for (let r = 0; r < 9; r += 3)
    for (let c = 0; c < 9; c += 3)
      structures.push(new Box3x3(originRow + r, originCol + c));
  for (let r = 0; r < 9; r++)
    structures.push(new Row(originRow + r, originCol, 9));
  for (let c = 0; c < 9; c++)
    structures.push(new Col(originCol + c, originRow, 9));
  
  // 9x9 전체 테두리 렌더링용 더미 구조체
  const grid9x9 = {
    type: 'grid9x9',
    coords: [], // 검증 로직에서 무시됨
    originRow: originRow,
    originCol: originCol,
    validate: () => [] // 에러 없음
  };
  structures.push(grid9x9);
  
  return structures;
}
