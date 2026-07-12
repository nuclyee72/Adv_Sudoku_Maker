/**
 * test_overlap2.js — 겹침 스도쿠 (2판) 스테이지 데이터
 */
export const test_overlap2 = {
  id: 'test_overlap2',
  name: 'test_overlap2',
  boards: [
    { row: 0, col: 6 }, // 오른쪽 위 판
    { row: 6, col: 0 }, // 왼쪽 아래 판
  ],
  givens: [
    { row: 7, col: 7, value: 5 },  // 겹치는 부분 (예시 데이터)
    { row: 0, col: 6, value: 1 },  // 오른쪽 위 판
    { row: 8, col: 14, value: 9 },
    { row: 6, col: 0, value: 2 },  // 왼쪽 아래 판
    { row: 14, col: 8, value: 8 },
  ],
};
