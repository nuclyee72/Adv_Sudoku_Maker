/**
 * gen_overlap_ineq_cons.js — 겹침(0,0·6,6) + 부등호 + 연속 템플릿 데이터
 */
export const gen_overlap_ineq_cons = {
  id: 'gen_overlap_ineq_cons',
  label: '겹침(0,0·6,6) + 부등호 + 연속',
  boards: [{ row: 0, col: 0 }, { row: 6, col: 6 }],
  rules: [
    { type: 'inequality', region: { row: 0, col: 0, height: 9, width: 9 }, coverage: { ratio: 0.25 } },
    { type: 'consecutive', region: { row: 6, col: 6, height: 9, width: 9 }, coverage: { ratio: 0.5 } },
  ],
};
