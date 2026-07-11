import { createStandardSudokuStructures } from '../structures/StandardSudoku.js';
import { crossGivens } from './cross_givens.js';

const s1 = createStandardSudokuStructures(0, 6);  // Top
const s2 = createStandardSudokuStructures(6, 0);  // Left
const s3 = createStandardSudokuStructures(6, 12); // Right
const s4 = createStandardSudokuStructures(12, 6); // Bottom

// 동일한 구조체 중복 제거 (정확한 좌표 비교)
const structMap = new Map();
[...s1, ...s2, ...s3, ...s4].forEach(s => {
  // 구조체 타입, 시작 좌표, 그리고 속한 셀 좌표들을 모두 결합하여 완벽한 고유 키 생성
  // (grid9x9처럼 coords가 비어있는 경우 origin 좌표로 구분하기 위함)
  const coordsKey = s.coords.map(c => `${c.row},${c.col}`).join('|');
  const key = `${s.type}-${s.originRow}-${s.originCol}-${coordsKey}`;
  if (!structMap.has(key)) structMap.set(key, s);
});

export const PUZZLE_CROSS = {
  structures: Array.from(structMap.values()),
  givens: crossGivens
};
