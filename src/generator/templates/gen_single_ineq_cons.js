/**
 * gen_single_ineq_cons.js — 단일(0,0) + 부등호 + 연속 템플릿 데이터.
 * 겹침 없는 9x9 보드 하나에 부등호/연속 규칙만 적용한 가장 단순한 버전.
 */
export const gen_single_ineq_cons = {
  id: 'gen_single_ineq_cons',
  label: '단일(0,0) + 부등호 + 연속',
  boards: [{ row: 0, col: 0 }],
  rules: [
    { type: 'inequality', region: { row: 0, col: 0, height: 9, width: 9 }, coverage: { ratio: 0.25 } },
    { type: 'consecutive', region: { row: 0, col: 0, height: 9, width: 9 }, coverage: { ratio: 0.5 } },
  ],
};
