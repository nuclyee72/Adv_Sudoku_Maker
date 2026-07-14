/**
 * logicSolver.js — naked single/hidden single만으로(추측 없이) 완전히 풀 수 있는지 검사.
 * row/col/box3x3 "전부 달라야 함" 제약에 더해, 부등호/연속/스네이크처럼 인접 칸끼리 값을
 * 직접 좁혀주는 규칙도 후보 제거에 반영한다 — 이 셋을 빼놓으면 이런 요소가 붙은 칸-쌍은
 * 사람 입장에선 표시만 보고도 뻔히 좁혀지는 정보인데 게이트만 못 보고 "아직 못 풂" 취급해서,
 * 캐빙이 실제보다 일찍 멈추고 같은 난이도라도 요소가 있는 퍼즐이 상대적으로 더 쉬워지는
 * 문제가 있었다. 턴테이블은 값 제약이 아니라 순수 상호작용 메커니즘이라 대상에서 제외한다.
 * board의 실제 셀 값은 건드리지 않고 스크래치 후보마스크 맵 위에서만 시뮬레이션한다.
 */
import { buildDistinctPeerIndex, key } from './peerIndex.js';
import { FULL_MASK, popcount, bitsOf } from './bitmask.js';

// ABOVE[v]/BELOW[v] = v보다 크거나/작은 1~9 값들의 비트마스크, CONSEC[v] = v와 1 차이나는
// (v-1, v+1 중 1~9 범위 안의) 값들의 비트마스크 — 매 호출마다 다시 계산할 필요 없이
// 모듈 로드 시 한 번만 만들어 재사용한다.
const ABOVE = [0];
const BELOW = [0];
const CONSEC = [0];
for (let v = 1; v <= 9; v++) {
  let above = 0, below = 0, consec = 0;
  for (let x = 1; x <= 9; x++) {
    if (x > v) above |= (1 << x);
    if (x < v) below |= (1 << x);
  }
  if (v - 1 >= 1) consec |= (1 << (v - 1));
  if (v + 1 <= 9) consec |= (1 << (v + 1));
  ABOVE.push(above);
  BELOW.push(below);
  CONSEC.push(consec);
}

function minOf(mask) { return Math.log2(mask & -mask) | 0; }
function maxOf(mask) { return 31 - Math.clz32(mask); }

/**
 * 부등호/연속/스네이크 구조체에서 "이 칸이 상대 칸과 어떤 관계인지"를 칸 좌표 기준으로
 * 양방향 인덱싱한다. 스네이크는 경로상 인접한 두 칸(값이 1만 차이나야 함)마다 연속
 * 관계와 동일하게 취급한다 — Snake.coords는 경로를 따라간 순서 그대로다.
 */
function buildComparisonIndex(board) {
  const index = new Map();
  const add = (k, entry) => {
    if (!index.has(k)) index.set(k, []);
    index.get(k).push(entry);
  };

  for (const s of board.structures) {
    if (s.type === 'inequality') {
      const ka = key(s.a.row, s.a.col), kb = key(s.b.row, s.b.col);
      add(ka, { otherKey: kb, greater: s.greater === 'a' });
      add(kb, { otherKey: ka, greater: s.greater === 'b' });
    } else if (s.type === 'consecutive') {
      const ka = key(s.a.row, s.a.col), kb = key(s.b.row, s.b.col);
      add(ka, { otherKey: kb, consecutive: true });
      add(kb, { otherKey: ka, consecutive: true });
    } else if (s.type === 'snake') {
      for (let i = 0; i < s.coords.length - 1; i++) {
        const ka = key(s.coords[i].row, s.coords[i].col);
        const kb = key(s.coords[i + 1].row, s.coords[i + 1].col);
        add(ka, { otherKey: kb, consecutive: true });
        add(kb, { otherKey: ka, consecutive: true });
      }
    }
  }
  return index;
}

export function isLogicSolvable(board, { peerIndex } = {}) {
  const idx = peerIndex ?? buildDistinctPeerIndex(board);
  const cmpIdx = buildComparisonIndex(board);
  const units = board.structures.filter(s => s.type === 'row' || s.type === 'col' || s.type === 'box3x3');

  // 칸마다 현재 가능한 후보 비트마스크 — 이미 값이 있는 칸은 그 값 하나짜리 비트로 고정하고
  // 시작한다. peer 제거는 "상대가 이미 확정됐을 때만"(기존과 동일 — naked pair 같은 고급
  // 기법으로 확장하지 않음), 부등호/연속/스네이크는 상대가 아직 미확정이어도 상대의 현재
  // 후보 범위(최솟값/최댓값 또는 전체 집합)로 경계를 좁힌다 — "1,2 중 하나인 두 칸인데
  // 부등호로 순서만 알면 바로 확정"되는, 사람이 실제로 쓰는 추론과 같은 방식이다.
  const masks = new Map();
  for (const cell of board.getVisibleCells()) {
    const k = key(cell.row, cell.col);
    masks.set(k, cell.value != null ? (1 << cell.value) : FULL_MASK);
  }

  let changed = true;
  while (changed) {
    changed = false;

    for (const [k, mask] of masks) {
      if (popcount(mask) === 1) continue;
      let next = mask;

      for (const pk of idx.get(k) ?? []) {
        const pm = masks.get(pk);
        if (popcount(pm) === 1) next &= ~pm;
      }

      for (const rel of cmpIdx.get(k) ?? []) {
        const om = masks.get(rel.otherKey);
        if (om === 0) continue;
        if (rel.consecutive) {
          let allowed = 0;
          for (const v of bitsOf(om)) allowed |= CONSEC[v];
          next &= allowed;
        } else {
          next &= rel.greater ? ABOVE[minOf(om)] : BELOW[maxOf(om)];
        }
      }

      if (next !== mask) {
        if (next === 0) return false; // 모순 — 이 클루 조합에선 논리적으로 막힘
        masks.set(k, next);
        changed = true;
      }
    }

    for (const unit of units) {
      for (let v = 1; v <= 9; v++) {
        let place = null, count = 0;
        for (const { row, col } of unit.coords) {
          const k = key(row, col);
          const m = masks.get(k);
          if (popcount(m) === 1) continue; // 이미 확정
          if (m & (1 << v)) { count++; place = k; if (count > 1) break; }
        }
        if (count === 1 && masks.get(place) !== (1 << v)) {
          masks.set(place, 1 << v);
          changed = true;
        }
      }
    }
  }

  for (const mask of masks.values()) if (popcount(mask) !== 1) return false;
  return true;
}
