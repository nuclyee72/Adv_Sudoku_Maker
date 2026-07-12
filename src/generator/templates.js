/**
 * templates.js — 자동 생성 템플릿 레지스트리.
 * 1차 스코프: 사용자가 검증용으로 준 겹침 보드 + 부등호 + 연속 템플릿 하나만 등록.
 */
export const templates = [
  {
    id: 'gen_overlap_ineq_cons',
    label: '겹침(0,0·6,6) + 부등호 + 연속',
    boards: [{ row: 0, col: 0 }, { row: 6, col: 6 }],
    rules: [
      { type: 'inequality', region: { row: 0, col: 0, height: 9, width: 9 }, coverage: { ratio: 0.25 } },
      { type: 'consecutive', region: { row: 6, col: 6, height: 9, width: 9 }, coverage: { ratio: 0.5 } },
    ],
  },
];
