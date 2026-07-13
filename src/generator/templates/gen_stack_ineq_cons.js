/**
 * gen_stack_ineq_cons.js — 세로 겹침(0,0·6,0) + 부등호 + 연속 템플릿 데이터.
 * 두 보드가 같은 열(col=0)에서 세로로 3칸씩(행 6~8, 전체 폭) 겹친다 — 기존
 * gen_overlap_ineq_cons(대각선 방향, 3x3 모서리만 겹침)와 다른 겹침 모양.
 * 두 보드를 합친 영역이 정확히 15x9 직사각형이라 부등호/연속을 보드별로
 * 나누지 않고 합친 영역 전체에 한 번씩만 적용한다.
 */
export const gen_stack_ineq_cons = {
  id: 'gen_stack_ineq_cons',
  label: '세로 겹침(0,0·6,0) + 부등호 + 연속',
  boards: [{ row: 0, col: 0 }, { row: 6, col: 0 }],
  rules: [
    { type: 'inequality', region: { row: 0, col: 0, height: 15, width: 9 }, coverage: { ratio: 0.25 } },
    { type: 'consecutive', region: { row: 0, col: 0, height: 15, width: 9 }, coverage: { ratio: 0.5 } },
  ],
};
