/**
 * cross.js — 십자형 스도쿠 (4판) 스테이지 데이터
 */
import { crossGivens } from './cross_givens.js';

export const cross = {
  id: 'cross-001',
  name: '십자형 스도쿠 (4판)',
  boards: [
    { row: 0, col: 6 },   // 위
    { row: 6, col: 0 },   // 왼쪽
    { row: 6, col: 12 },  // 오른쪽
    { row: 12, col: 6 },  // 아래
  ],
  givens: crossGivens,
};
