/**
 * index.js — 플레이 가능한 퍼즐 스테이지 목록
 */
import { PUZZLE_SINGLE } from './standard9x9.js';
import { PUZZLE_CROSS } from './cross.js';
import { PUZZLE_OVERLAPPING } from './overlapping.js';

export const PUZZLES = [PUZZLE_SINGLE, PUZZLE_CROSS, PUZZLE_OVERLAPPING];
