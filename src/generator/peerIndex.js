/**
 * peerIndex.js — 생성기 전용 인덱스
 * board.getPeers()는 보드에 걸린 모든 구조체 타입을 합쳐버려서, "전부 달라야 함" 규칙이
 * 없는 턴테이블 같은 구조체까지 과제약하게 된다. 생성기는 규칙 종류별로 인덱스를 분리해 쓴다.
 */

function key(row, col) { return `${row},${col}`; }

/** row/col/box3x3 구조체만으로 "같은 값이면 안 되는" 이웃 좌표 집합을 만든다. */
export function buildDistinctPeerIndex(board) {
  const peers = new Map();
  for (const s of board.structures) {
    if (s.type !== 'row' && s.type !== 'col' && s.type !== 'box3x3') continue;
    for (const c1 of s.coords) {
      const k1 = key(c1.row, c1.col);
      if (!peers.has(k1)) peers.set(k1, new Set());
      const set = peers.get(k1);
      for (const c2 of s.coords) {
        if (c1.row === c2.row && c1.col === c2.col) continue;
        set.add(key(c2.row, c2.col));
      }
    }
  }
  return peers;
}

/** inequality/consecutive/snake 구조체만 좌표 → 구조체 목록으로 인덱싱한다(부등호/연속/스네이크 규칙 검사용). */
export function buildExtraStructureIndex(board) {
  const index = new Map();
  for (const s of board.structures) {
    if (s.type !== 'inequality' && s.type !== 'consecutive' && s.type !== 'snake') continue;
    for (const c of s.coords) {
      const k = key(c.row, c.col);
      if (!index.has(k)) index.set(k, []);
      index.get(k).push(s);
    }
  }
  return index;
}

export { key };
