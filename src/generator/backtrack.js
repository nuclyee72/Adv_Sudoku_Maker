/**
 * backtrack.js — 생성기용 범용 백트래킹 엔진.
 * MRV(후보 최소 칸 우선) + row/col/box 비트마스크로 표준 스도쿠 제약을 빠르게 다루고,
 * inequality/consecutive/snake처럼 값 배치 후에만 판정 가능한 규칙은
 * Structure.validate()를 그대로 재사용해 "좌표가 전부 채워졌을 때"만 검사한다.
 */
import { buildDistinctPeerIndex, buildExtraStructureIndex, key } from './peerIndex.js';
import { rotateGrid } from './gridRotate.js';
import { FULL_MASK, popcount, bitsOf } from './bitmask.js';
import { shuffle } from './random.js';

class NodeCapExceeded extends Error {}

export function makeCheckers(board) {
  const peerIndex = buildDistinctPeerIndex(board);
  const extraIndex = buildExtraStructureIndex(board);

  function usedMask(cell) {
    let mask = 0;
    const peers = peerIndex.get(key(cell.row, cell.col));
    if (!peers) return 0;
    for (const pk of peers) {
      const [pr, pc] = pk.split(',').map(Number);
      const pcell = board.getCell(pr, pc);
      if (pcell && pcell.value !== null) mask |= (1 << pcell.value);
    }
    return mask;
  }

  function extraOk(cell) {
    const list = extraIndex.get(key(cell.row, cell.col));
    if (!list) return true;
    for (const s of list) {
      if (s.coords.some(({ row, col }) => board.getCell(row, col)?.value === null)) continue;
      if (s.validate(board).length > 0) return false;
    }
    return true;
  }

  // peerIndex/extraIndex도 그대로 얹어 반환 — board.structures가 안 바뀌는 동안(예: carveGivens의
  // 제거 루프 전체) 호출 쪽이 fillRandomSolution/countSolutions에 재사용하도록 넘길 수 있게 한다.
  return { usedMask, extraOk, peerIndex, extraIndex };
}

/**
 * 현재 board 상태(비어있지 않은 칸은 전부 고정 컨텍스트로 취급)에서, 나머지 빈 칸을
 * row/col/box 제약 + extra 구조체(inequality/consecutive/snake) 규칙을 만족하도록
 * 랜덤한 순서로 탐색해 하나의 완성 해를 채워 넣는다. 이미 값이 있는 칸은 건드리지 않는다.
 * 성공 시 true(보드에 실제로 값이 채워짐), 실패(막힘/노드 상한/시간 예산 초과) 시 false를
 * 반환하고 시도 중 채운 값은 전부 되돌린다.
 *
 * 스네이크/턴테이블이 많이 걸린(특히 "어려움") 조합은 사전에 값을 채워둔 칸이 많아 순수
 * 랜덤 배정이 막다른 길에 자주 몰리는데, nodeCap만 있으면 한 번의 시도가 초 단위로 길게
 * 막힐 수 있고, 그동안 완전히 동기 실행이라 브라우저 탭이 응답 없음 상태가 된다.
 * timeBudgetMs로 한 시도의 최대 시간을 못박고(초과 시 실패 처리 — 호출 쪽 generatePuzzle이
 * 다른 무작위 순서로 재시도), 탐색 중간중간 이벤트 루프에 제어권을 돌려줘 탭이 멈춘 것처럼
 * 보이지 않게 한다.
 */
export async function fillRandomSolution(board, { nodeCap = 300000, timeBudgetMs = 8000, checkers } = {}) {
  const { usedMask, extraOk } = checkers ?? makeCheckers(board);
  const targets = board.getVisibleCells().filter(c => c.value === null);
  const deadline = Date.now() + timeBudgetMs;
  let nodes = 0;
  let lastYield = Date.now();

  function pickMrvCell() {
    let best = null, bestMask = 0, bestCount = 10;
    for (const cell of targets) {
      if (cell.value !== null) continue;
      const avail = FULL_MASK & ~usedMask(cell);
      const count = popcount(avail);
      if (count === 0) return { deadEnd: true };
      if (count < bestCount) {
        best = cell; bestMask = avail; bestCount = count;
        if (count === 1) break;
      }
    }
    return best ? { cell: best, mask: bestMask } : null;
  }

  async function backtrack() {
    if (++nodes > nodeCap) throw new NodeCapExceeded();
    // 매 노드마다 Date.now()/setTimeout을 부르면 그 자체가 비용이라, 256개마다 한 번만
    // 확인한다. 실제 이벤트 루프 양보는 마지막 양보로부터 50ms가 지났을 때만 해서,
    // 노드가 빨리 도는 구간에서 불필요한 setTimeout(0) 클램핑 지연이 쌓이지 않게 한다.
    if ((nodes & 255) === 0) {
      const now = Date.now();
      if (now > deadline) throw new NodeCapExceeded();
      if (now - lastYield > 50) {
        lastYield = now;
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    const pick = pickMrvCell();
    if (pick === null) return true; // 빈 칸 없음 = 완성
    if (pick.deadEnd) return false;

    const { cell, mask } = pick;
    const candidates = shuffle(bitsOf(mask));
    for (const v of candidates) {
      cell.value = v;
      if (extraOk(cell) && await backtrack()) return true;
      cell.value = null;
    }
    return false;
  }

  try {
    return await backtrack();
  } catch (e) {
    if (e instanceof NodeCapExceeded) return false;
    throw e;
  }
}

/**
 * 현재 board 상태(빈 칸이 있는 부분 클루 상태)에서 유효한 완성 해가 몇 개인지 cap까지 센다.
 * turntableRegions가 있으면 그 영역의 회전(최대 4가지)도 미지수로 취급해 분기한다 —
 * 진짜 값 하나로 고정해 버리면 "다른 회전도 우연히 풀릴 가능성"을 놓쳐 유일해 오판정이 난다.
 * 영역 안의 칸이 이미 비어있어도(null) 안전함 — 회전으로 자리만 옮겨지고, 값은 나머지 빈
 * 칸들과 함께 일반 백트래킹으로 채워진다.
 * 반환값 { count, capped } — capped=true면 nodeCap을 넘겨 정확한 값을 못 셌다는 뜻이므로
 * 호출 쪽에서는 안전하게 "유일하지 않음"으로 취급해야 한다.
 */
export function countSolutions(board, { cap = 2, turntableRegions = [], nodeCap = 300000, checkers } = {}) {
  const { usedMask, extraOk } = checkers ?? makeCheckers(board);
  const allCells = board.getVisibleCells();
  let nodes = 0;
  let capped = false;

  function pickMrvCell() {
    let best = null, bestMask = 0, bestCount = 10;
    for (const cell of allCells) {
      if (cell.value !== null) continue;
      const avail = FULL_MASK & ~usedMask(cell);
      const count = popcount(avail);
      if (count === 0) return { deadEnd: true };
      if (count < bestCount) {
        best = cell; bestMask = avail; bestCount = count;
        if (count === 1) break;
      }
    }
    return best ? { cell: best, mask: bestMask } : null;
  }

  function countRest(remainingCap) {
    if (capped || remainingCap <= 0) return 0;
    if (++nodes > nodeCap) { capped = true; return 0; }
    const pick = pickMrvCell();
    if (pick === null) return 1; // 완성된 해 하나
    if (pick.deadEnd) return 0;

    const { cell, mask } = pick;
    let found = 0;
    for (const v of bitsOf(mask)) {
      if (found >= remainingCap) break;
      cell.value = v;
      if (extraOk(cell)) found += countRest(remainingCap - found);
      cell.value = null;
      if (capped) break;
    }
    return found;
  }

  function branchTurntables(idx, remainingCap) {
    if (capped || remainingCap <= 0) return 0;
    if (idx >= turntableRegions.length) return countRest(remainingCap);

    const region = turntableRegions[idx];
    const n = region.size;
    const trueGrid = [], cells = [];
    for (let r = 0; r < n; r++) {
      trueGrid.push([]); cells.push([]);
      for (let c = 0; c < n; c++) {
        const cell = board.getCell(region.originRow + r, region.originCol + c);
        trueGrid[r].push(cell.value);
        cells[r].push(cell);
      }
    }

    let total = 0;
    for (let rot = 0; rot < 4; rot++) {
      const candidate = rotateGrid(trueGrid, rot);
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) cells[r][c].value = candidate[r][c];

      // 회전 후보를 곧장 recurse에 넘기면, 남은 미배정 칸이 없거나 이 영역의 peer를
      // 참조하는 칸이 하나도 없을 때 충돌이 전혀 검사되지 않고 "해 1개"로 잘못 셀 수 있다.
      // 그래서 여기서 직접 peer/부가구조체 유효성을 확인한 후에만 recurse한다.
      // trueGrid에 null(턴테이블 내부의 빈 칸)이 섞여 있으면 회전으로 자리만 옮겨질 뿐이고,
      // 그 칸은 여기선 충돌 검사 없이 그대로 둬서 이어지는 countRest가 다른 빈 칸들과 함께
      // 백트래킹으로 값을 채우게 한다.
      const flatCells = cells.flat();
      const valid = flatCells.every(cell =>
        cell.value === null || (!(usedMask(cell) & (1 << cell.value)) && extraOk(cell))
      );
      if (valid) total += branchTurntables(idx + 1, remainingCap - total);

      if (total >= remainingCap || capped) break;
    }

    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) cells[r][c].value = trueGrid[r][c];
    return total;
  }

  const total = branchTurntables(0, cap);
  return { count: Math.min(total, cap), capped };
}
