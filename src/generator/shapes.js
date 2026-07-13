/**
 * shapes.js — 자동 생성 "모양" 레지스트리. 보드 원점(3의 배수) 배치만 담는다 —
 * 어떤 규칙(부등호/연속/스네이크/턴테이블)을 붙일지는 composeTemplate.js가 요소 선택을 보고
 * 매번 합성한다. "랜덤"은 여기 저장하지 않고 선택 시점에 이 목록 중 하나로 해석한다.
 */
export const shapes = [
  { id: 'single', label: '단일 1개(0,0)', boards: [{ row: 0, col: 0 }] },
  { id: 'pair_h', label: '가로 2개(0,0·0,6)', boards: [{ row: 0, col: 0 }, { row: 0, col: 6 }] },
  { id: 'pair_diag', label: '대각 2개(0,0·6,6)', boards: [{ row: 0, col: 0 }, { row: 6, col: 6 }] },
  { id: 'staircase3', label: '계단형 3개(0,0·6,6·12,12)', boards: [{ row: 0, col: 0 }, { row: 6, col: 6 }, { row: 12, col: 12 }] },
  { id: 'row3', label: '가로 3개(0,0·0,6·0,12)', boards: [{ row: 0, col: 0 }, { row: 0, col: 6 }, { row: 0, col: 12 }] },
  {
    id: 'diamond4',
    label: '마름모형 4개',
    boards: [
      { row: 0, col: 6 },  // 위
      { row: 6, col: 12 }, // 오른쪽
      { row: 12, col: 6 }, // 아래
      { row: 6, col: 0 },  // 왼쪽
    ],
  },
];

export function getShape(shapeId) {
  return shapes.find(s => s.id === shapeId) ?? null;
}
