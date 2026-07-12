/**
 * index.js — 플레이 가능한 퍼즐 스테이지 목록
 *
 * stages/ 안의 데이터를 builder/로 조립해 PUZZLES 배열을 만든다.
 * 새 퍼즐 추가 방법: stages/에 데이터 파일 하나 만들고 아래 STAGES 배열에 추가.
 */
import { buildPuzzle } from './builder/index.js';
import { test_9x9 } from './stages/test_9x9.js';
import { test_overlap4 } from './stages/test_overlap4.js';
import { test_overlap2 } from './stages/test_overlap2.js';
import { test_inequality } from './stages/test_inequality.js';
import { test_consecutive } from './stages/test_consecutive.js';
import { test_snake } from './stages/test_snake.js';
import { test_turntable3 } from './stages/test_turntable3.js';
import { test_turntable4 } from './stages/test_turntable4.js';

const STAGES = [
  test_9x9, test_overlap4, test_overlap2, test_inequality,
  test_consecutive, test_snake, test_turntable3, test_turntable4,
];

export const PUZZLES = STAGES.map(buildPuzzle);
