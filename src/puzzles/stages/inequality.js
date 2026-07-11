/**
 * inequality.js — 부등호 3x3 스도쿠 스테이지 데이터
 * 3x3 박스 안에서 인접한 두 칸 사이에 부등호(<,>) 표시가 있고,
 * 표시된 대소 관계를 만족해야 하는 변형 규칙.
 */
export const inequality = {
  id: 'inequality-001',
  name: '부등호 스도쿠 (3x3)',
  boards: [{ row: 0, col: 0 }],
  grid: [
    [5,3,0,0,7,0,0,0,0],
    [6,0,0,1,9,5,0,0,0],
    [0,9,8,0,0,0,0,6,0],
    [8,0,0,0,6,0,0,0,3],
    [4,0,0,8,0,3,0,0,1],
    [7,0,0,0,2,0,0,0,6],
    [0,6,0,0,0,0,2,8,0],
    [0,0,0,4,1,9,0,0,5],
    [0,0,0,0,8,0,0,7,9],
  ],
  inequalities: [
    { a: { row: 0, col: 1 }, b: { row: 1, col: 1 }, greater: 'b' },
    { a: { row: 1, col: 1 }, b: { row: 1, col: 2 }, greater: 'a' },
    { a: { row: 1, col: 0 }, b: { row: 2, col: 0 }, greater: 'a' },
    { a: { row: 0, col: 2 }, b: { row: 1, col: 2 }, greater: 'a' },
    { a: { row: 2, col: 0 }, b: { row: 2, col: 1 }, greater: 'b' },
    { a: { row: 0, col: 7 }, b: { row: 0, col: 8 }, greater: 'b' },
    { a: { row: 1, col: 6 }, b: { row: 2, col: 6 }, greater: 'b' },
  ],
};
