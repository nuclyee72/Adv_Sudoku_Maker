import { createStandardSudokuStructures } from '../structures/StandardSudoku.js';

const s1 = createStandardSudokuStructures(0, 6); // 오른쪽 위 판
const s2 = createStandardSudokuStructures(6, 0); // 왼쪽 아래 판

// 동일한 구조체 중복 제거 (정확한 좌표 비교)
const structMap = new Map();
[...s1, ...s2].forEach(s => {
  // 구조체 타입, 시작 좌표, 그리고 속한 셀 좌표들을 모두 결합하여 완벽한 고유 키 생성
  // (grid9x9처럼 coords가 비어있는 경우 origin 좌표로 구분하기 위함)
  const coordsKey = s.coords.map(c => `${c.row},${c.col}`).join('|');
  const key = `${s.type}-${s.originRow}-${s.originCol}-${coordsKey}`;
  if (!structMap.has(key)) structMap.set(key, s);
});

export const PUZZLE_OVERLAPPING = {
  id: 'overlap-001',
  name: '겹침 스도쿠 (2판)',
  structures: Array.from(structMap.values()),
  givens: [
    // 겹치는 부분 (예시 데이터)
    { row: 7, col: 7, value: 5 },
    // 오른쪽 위 판
    { row: 0, col: 6, value: 1 },
    { row: 8, col: 14, value: 9 },
    // 왼쪽 아래 판
    { row: 6, col: 0, value: 2 },
    { row: 14, col: 8, value: 8 }
  ]
};
