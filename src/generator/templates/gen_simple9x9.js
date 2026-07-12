/**
 * gen_simple9x9.js — 단일 9x9, 부가 규칙 없음.
 * 생성이 가장 빠르고(부등호/연속/스네이크/턴테이블 배치 계산이 전혀 없음) 다른 규칙에
 * 방해받지 않아 사람이 손으로 빠르게 풀기도 쉬운, 순수 테스트/데모용 템플릿.
 */
export const gen_simple9x9 = {
  id: 'gen_simple9x9',
  label: '테스트용 (9x9 단일, 규칙 없음)',
  boards: [{ row: 0, col: 0 }],
  rules: [],
};
