/**
 * snakeWalk.js — 스네이크 규칙용 랜덤 경로 + 등차수열 값 선정.
 * 그리디 랜덤워크는 목표 길이 전에 막다른 길에 몰릴 수 있어, 백트래킹 DFS로 경로를 뽑는다.
 * 경로가 정해지면 시작값/방향을 시도하면서 board.getPeers()로 즉시 row/col/box 충돌을
 * 검사한다(이 시점엔 row/col/box 구조체만 존재하므로 getPeers()를 써도 안전 — 아직
 * inequality/consecutive/turntable 구조체가 board에 없음).
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

function assignPathValues(board, path) {
  const n = path.length;
  for (const dir of shuffle([1, -1])) {
    const minStart = dir === 1 ? 1 : n;
    const maxStart = dir === 1 ? 9 - n + 1 : 9;
    if (minStart > maxStart) continue;
    const starts = shuffle(Array.from({ length: maxStart - minStart + 1 }, (_, i) => minStart + i));

    for (const v0 of starts) {
      const placed = [];
      let ok = true;
      for (let i = 0; i < n; i++) {
        const v = v0 + dir * i;
        const cell = path[i];
        const conflict = board.getPeers(cell.row, cell.col)
          .some(({ row, col }) => board.getCell(row, col)?.value === v);
        if (conflict) { ok = false; break; }
        cell.value = v;
        placed.push(cell);
      }
      if (ok) return true;
      for (const c of placed) c.value = null;
    }
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
