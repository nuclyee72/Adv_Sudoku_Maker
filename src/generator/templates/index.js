/**
 * index.js — 자동 생성 템플릿 레지스트리.
 *
 * stages/ 안의 데이터를 puzzles/index.js가 모으는 것과 동일한 패턴:
 * 이 폴더 안의 데이터를 모아 templates 배열을 만든다.
 * 새 템플릿 추가 방법: 이 폴더에 데이터 파일 하나 만들고 아래 templates 배열에 추가.
 */
import { gen_overlap_ineq_cons } from './gen_overlap_ineq_cons.js';
import { gen_staircase_ineq_snake_turntable_cons } from './gen_staircase_ineq_snake_turntable_cons.js';
import { gen_diamond_ineq_cons_snake_turntable } from './gen_diamond_ineq_cons_snake_turntable.js';
import { gen_simple9x9 } from './gen_simple9x9.js';
import { gen_single_ineq_cons } from './gen_single_ineq_cons.js';
import { gen_stack_ineq_cons } from './gen_stack_ineq_cons.js';

export const templates = [
  gen_simple9x9,
  gen_single_ineq_cons,
  gen_stack_ineq_cons,
  gen_overlap_ineq_cons,
  gen_staircase_ineq_snake_turntable_cons,
  gen_diamond_ineq_cons_snake_turntable,
];
