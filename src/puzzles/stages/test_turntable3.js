/**
 * test_turntable3.js — 턴테이블 스도쿠 스테이지 데이터
 * 가운데 3x3 박스가 90도 돌아간 채로 주어진다. 손잡이를 드래그해 돌려서
 * 올바른 방향으로 맞춰야 나머지 스도쿠 규칙과 들어맞는다.
 */
export const test_turntable3 = {
  id: 'test_turntable3',
  name: 'test_turntable3',
  boards: [{ row: 0, col: 0 }],
  givens: [
    { row: 0, col: 0, value: 5 }, { row: 0, col: 1, value: 3 }, { row: 0, col: 4, value: 7 },
    { row: 1, col: 0, value: 6 }, { row: 1, col: 3, value: 1 }, { row: 1, col: 4, value: 9 }, { row: 1, col: 5, value: 5 },
    { row: 2, col: 1, value: 9 }, { row: 2, col: 2, value: 8 }, { row: 2, col: 7, value: 6 },
    { row: 3, col: 0, value: 8 }, { row: 3, col: 8, value: 3 },
    { row: 4, col: 0, value: 4 }, { row: 4, col: 8, value: 1 },
    { row: 5, col: 0, value: 7 }, { row: 5, col: 8, value: 6 },
    { row: 6, col: 1, value: 6 }, { row: 6, col: 6, value: 2 }, { row: 6, col: 7, value: 8 },
    { row: 7, col: 3, value: 4 }, { row: 7, col: 4, value: 1 }, { row: 7, col: 5, value: 9 }, { row: 7, col: 8, value: 5 },
    { row: 8, col: 4, value: 8 }, { row: 8, col: 7, value: 7 }, { row: 8, col: 8, value: 9 },
    // 턴테이블 영역(rows3-5, cols3-5) — 정답(7 6 1 / 8 5 3 / 9 2 4)에서 시계방향 90도 돌아간 채로 주어짐.
    // 반시계 방향으로 한 번(또는 시계로 세 번) 돌리면 맞는 자리로 정렬된다.
    { row: 3, col: 3, value: 9 }, { row: 3, col: 4, value: 8 }, { row: 3, col: 5, value: 7 },
    { row: 4, col: 3, value: 2 }, { row: 4, col: 4, value: 5 }, { row: 4, col: 5, value: 6 },
    { row: 5, col: 3, value: 4 }, { row: 5, col: 4, value: 3 }, { row: 5, col: 5, value: 1 },
  ],
  turntables: [
    { originRow: 3, originCol: 3, size: 3 },
  ],
};
