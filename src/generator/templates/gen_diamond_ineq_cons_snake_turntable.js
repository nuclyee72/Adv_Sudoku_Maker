/**
 * gen_diamond_ineq_cons_snake_turntable.js — 마름모형(위·오른쪽·아래·왼쪽) 4보드,
 * 서로 모서리 3x3씩 겹침 + 왼쪽 부등호·턴테이블 / 오른쪽 연속·턴테이블 / 위아래 부등호·연속·스네이크.
 *
 * 보드 배치(각 9x9, 모서리끼리만 3x3 겹침 — 대각선 반대편끼리는 안 겹침):
 *   위:    (0,6)   오른쪽: (6,12)
 *   왼쪽:  (6,0)   아래:   (12,6)
 * 겹침 지점: 위-오른쪽(6-8,12-14) / 오른쪽-아래(12-14,12-14) / 아래-왼쪽(12-14,6-8) / 왼쪽-위(6-8,6-8)
 * 턴테이블은 왼쪽/오른쪽 보드의 정중앙 박스(다른 보드와 안 겹치는 자리)에 고정.
 */
export const gen_diamond_ineq_cons_snake_turntable = {
  id: 'gen_diamond_ineq_cons_snake_turntable',
  label: '마름모형(위·오·아·왼) + 부등호·턴테이블 / 연속·턴테이블 / 부등호·연속·스네이크',
  boards: [
    { row: 0, col: 6 },  // 위
    { row: 6, col: 12 }, // 오른쪽
    { row: 12, col: 6 }, // 아래
    { row: 6, col: 0 },  // 왼쪽
  ],
  rules: [
    // 왼쪽: 부등호 + 3x3 턴테이블
    { type: 'inequality', region: { row: 6, col: 0, height: 9, width: 9 }, coverage: { ratio: 0.25 } },
    { type: 'turntable', region: { row: 9, col: 3, height: 3, width: 3 }, size: 3 },
    // 오른쪽: 연속 + 3x3 턴테이블
    { type: 'consecutive', region: { row: 6, col: 12, height: 9, width: 9 }, coverage: { ratio: 0.5 } },
    { type: 'turntable', region: { row: 9, col: 15, height: 3, width: 3 }, size: 3 },
    // 위: 부등호 + 연속 + 10칸 스네이크
    { type: 'inequality', region: { row: 0, col: 6, height: 9, width: 9 }, coverage: { ratio: 0.25 } },
    { type: 'consecutive', region: { row: 0, col: 6, height: 9, width: 9 }, coverage: { ratio: 0.5 } },
    { type: 'snake', region: { row: 0, col: 6, height: 9, width: 9 }, length: [10, 10] },
    // 아래: 부등호 + 연속 + 10칸 스네이크
    { type: 'inequality', region: { row: 12, col: 6, height: 9, width: 9 }, coverage: { ratio: 0.25 } },
    { type: 'consecutive', region: { row: 12, col: 6, height: 9, width: 9 }, coverage: { ratio: 0.5 } },
    { type: 'snake', region: { row: 12, col: 6, height: 9, width: 9 }, length: [10, 10] },
  ],
};
