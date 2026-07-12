/**
 * gen_staircase_ineq_snake_turntable_cons.js — 계단형(0,0·6,6·12,12) +
 * 부등호 · 스네이크+턴테이블 · 연속 템플릿 데이터
 */
export const gen_staircase_ineq_snake_turntable_cons = {
  id: 'gen_staircase_ineq_snake_turntable_cons',
  label: '계단형(0,0·6,6·12,12) + 부등호 · 스네이크+턴테이블 · 연속',
  boards: [{ row: 0, col: 0 }, { row: 6, col: 6 }, { row: 12, col: 12 }],
  rules: [
    { type: 'inequality', region: { row: 0, col: 0, height: 9, width: 9 }, coverage: { ratio: 0.25 } },
    { type: 'snake', region: { row: 6, col: 6, height: 9, width: 9 }, length: [9, 9] },
    { type: 'turntable', region: { row: 9, col: 9, height: 3, width: 3 }, size: 3 },
    { type: 'consecutive', region: { row: 12, col: 12, height: 9, width: 9 }, coverage: { ratio: 0.5 } },
  ],
};
