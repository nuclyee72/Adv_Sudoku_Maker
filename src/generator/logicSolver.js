/**
 * logicSolver.js — naked single/hidden single만으로(추측 없이) 완전히 풀 수 있는지 검사.
 * row/col/box만 본다 — inequality/consecutive/snake/turntable 회전 추론은 이 게이트에서 다루지 않는다
 * (사용자가 확정한 난이도 스코프: "기본기법으로 완전히 풀리는 선까지").
 * board의 실제 셀 값은 건드리지 않고 스크래치 값 맵 위에서만 시뮬레이션한다.
 */
import { buildDistinctPeerIndex, key } from './peerIndex.js';
import { FULL_MASK, popcount, bitsOf } from './bitmask.js';

export function isLogicSolvable(board) {
  const peerIndex = buildDistinctPeerIndex(board);
  const units = board.structures.filter(s => s.type === 'row' || s.type === 'col' || s.type === 'box3x3');
  const values = new Map();
  for (const cell of board.getVisibleCells()) values.set(key(cell.row, cell.col), cell.value);

  function candidateMask(k) {
    let mask = FULL_MASK;
    for (const pk of peerIndex.get(k) ?? []) {
      const v = values.get(pk);
      if (v != null) mask &= ~(1 << v);
    }
    return mask;
  }

  let changed = true;
  while (changed) {
    changed = false;

    for (const [k, v] of values) {
      if (v !== null) continue;
      const mask = candidateMask(k);
      if (mask === 0) return false; // 모순 — 이 클루 조합에선 논리적으로 막힘
      if (popcount(mask) === 1) { values.set(k, bitsOf(mask)[0]); changed = true; }
    }

    for (const unit of units) {
      const present = new Set();
      for (const { row, col } of unit.coords) {
        const v = values.get(key(row, col));
        if (v != null) present.add(v);
      }
      for (let v = 1; v <= 9; v++) {
        if (present.has(v)) continue;
        let place = null, count = 0;
        for (const { row, col } of unit.coords) {
          const k = key(row, col);
          if (values.get(k) !== null) continue;
          if (candidateMask(k) & (1 << v)) { count++; place = k; if (count > 1) break; }
        }
        if (count === 1) { values.set(place, v); changed = true; }
      }
    }
  }

  for (const v of values.values()) if (v === null) return false;
  return true;
}
