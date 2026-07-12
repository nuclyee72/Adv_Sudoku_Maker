/**
 * index.js — 플레이 가능한 퍼즐 스테이지 목록
 *
 * stages/ 안의 데이터를 builder.js로 조립해 PUZZLES 배열을 만든다.
 * 새 퍼즐 추가 방법: stages/에 데이터 파일 하나 만들고 아래 STAGES 배열에 추가.
 */
import { buildPuzzle } from './builder.js';
import { single } from './stages/single.js';
import { cross } from './stages/cross.js';
import { overlapping } from './stages/overlapping.js';
import { inequality } from './stages/inequality.js';
import { consecutive } from './stages/consecutive.js';
import { snake } from './stages/snake.js';
import { turntable } from './stages/turntable.js';
import { turntable4 } from './stages/turntable4.js';

const STAGES = [single, cross, overlapping, inequality, consecutive, snake, turntable, turntable4];

export const PUZZLES = STAGES.map(buildPuzzle);
