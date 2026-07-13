/**
 * snakeWalk.js — 스네이크 규칙용 랜덤 경로 + 값 선정.
 * 그리디 랜덤워크는 목표 길이 전에 막다른 길에 몰릴 수 있어, 백트래킹 DFS로 경로를 뽑는다.
 * 값 배정은 Snake.js의 실제 규칙(경로를 따라 "한 걸음마다 값이 1씩만 차이나는" 해밀턴
 * 경로)과 똑같이 맞춘다 — 단조증가/감소하는 1~9 등차수열이 아니라, 예를 들어
 * 1-2-3-2-3-4-5-6-7-6-5처럼 오르내리며 값이 반복될 수 있는 걸음(walk)이라, 경로 길이가
 * 9칸을 넘어갈 수도 있다(9개 숫자만 도는 단조 수열이었을 땐 9칸이 수학적 한계였음).
 * 경로가 정해지면 셀마다 이전 셀 값에서 ±1인 후보를 백트래킹으로 시도하면서
 * board.getPeers()로 즉시 row/col/box 충돌을 검사한다(이 시점엔 row/col/box 구조체만
 * 존재하므로 getPeers()를 써도 안전 — 아직 inequality/consecutive/turntable 구조체가
 * board에 없음).
 */
import { shuffle, randInt, pick } from './random.js';

function key(row, col) { return `${row},${col}`; }

function buildWalk(board, region, targetLen, reservedKeys) {
  const inRegion = (r, c) =>
    r >= region.row && r < region.row + region.height &&
    c >= region.col && c < region.col + region.width &&
    !reservedKeys.has(key(r, c));

  const candidates = board.getVisibleCells().filter(c => inRegion(c.row, c.col));
  if (candidates.length < targetLen) return null;

  const start = pick(candidates);
  const visited = new Set();
  const path = [];

  function dfs(cell) {
    visited.add(key(cell.row, cell.col));
    path.push(cell);
    if (path.length === targetLen) return true;

    const dirs = shuffle([[0, 1], [0, -1], [1, 0], [-1, 0]]);
    for (const [dr, dc] of dirs) {
      const next = board.getCell(cell.row + dr, cell.col + dc);
      if (!next || !next.isVisible || !inRegion(next.row, next.col)) continue;
      if (visited.has(key(next.row, next.col))) continue;
      if (dfs(next)) return true;
    }

    visited.delete(key(cell.row, cell.col));
    path.pop();
    return false;
  }

  return dfs(start) ? path : null;
}

function peerConflict(board, cell, value) {
  return board.getPeers(cell.row, cell.col)
    .some(({ row, col }) => board.getCell(row, col)?.value === value);
}

/**
 * path[0]부터 순서대로, 매 칸마다 "이전 칸 값 ±1" 후보를 백트래킹으로 시도해 채운다.
 * Snake.js의 실제 검증 규칙과 동일한 걸음(한 걸음마다 1씩만 차이) — 값이 오르내리며
 * 반복돼도 되므로 경로 길이가 9칸을 넘어도 값 자체는 항상 배정 가능하다(막히는 건
 * row/col/box 충돌 때문일 뿐).
 */
function assignPathValues(board, path) {
  const n = path.length;

  function fillFrom(index, prevValue) {
    if (index === n) return true;
    const cell = path[index];
    const candidates = shuffle([prevValue - 1, prevValue + 1].filter(v => v >= 1 && v <= 9));
    for (const v of candidates) {
      if (peerConflict(board, cell, v)) continue;
      cell.value = v;
      if (fillFrom(index + 1, v)) return true;
      cell.value = null;
    }
    return false;
  }

  const startCell = path[0];
  for (const v0 of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (peerConflict(board, startCell, v0)) continue;
    startCell.value = v0;
    if (fillFrom(1, v0)) return true;
    startCell.value = null;
  }
  return false;
}

/**
 * region 안에서 [minLen,maxLen] 길이의 자기회피 경로를 찾아 값까지 채워 넣는다.
 * 성공 시 { cells:[{row,col}], start:{row,col} }, 여러 번 시도해도 실패하면 null.
 */
export function pickSnakeWalk(board, region, [minLen, maxLen], attempts = 40, reservedKeys = new Set()) {
  const targetLen = randInt(minLen, maxLen);

  for (let i = 0; i < attempts; i++) {
    const path = buildWalk(board, region, targetLen, reservedKeys);
    if (!path) continue;
    if (assignPathValues(board, path)) {
      return {
        cells: path.map(c => ({ row: c.row, col: c.col })),
        start: { row: path[0].row, col: path[0].col },
      };
    }
  }
  return null;
}
