/**
 * carveGivens.js — 완성된 해에서 클루를 최대한 제거한다.
 * 클루를 지우는 건 제약을 "느슨하게" 만드는 것뿐이라, 어떤 칸을 지웠을 때 해가 여러 개가
 * 되면 그 뒤로 다른 칸을 더 지워도(제약이 더 느슨해질 뿐이므로) 절대 다시 유일해질 수 없다.
 * 그래서 무작위 순서로 한 바퀴만 돌면서 "지금 상태에서 이 칸을 지워도 되는가"만 판정하면
 * 충분하고, 여러 번 훑을 필요가 없다.
 */
import { countSolutions } from './backtrack.js';
import { isLogicSolvable } from './logicSolver.js';
import { shuffle } from './random.js';

/**
 * board: 모든 보이는 칸이 정답값으로 채워져 있고, 규칙 구조체(부등호/연속/스네이크/턴테이블)까지
 * 다 붙은 상태여야 한다. 턴테이블 영역 칸도 다른 칸과 똑같이 제거를 시도한다 — 회전 방향과
 * 남은 빈 칸 값을 함께 추리해야 유일해가 되는지는 countSolutions(turntableRegions)가 판정한다.
 * 청크마다 잠깐 이벤트 루프에 양보해서(await) 탭이 안 멈추게 한다.
 */
export async function carveGivens(board, { turntableRegions = [], chunkSize = 15 } = {}) {
  const allCells = board.getVisibleCells();
  for (const cell of allCells) cell.isGiven = true; // 시작점: 전부 given(정답값 그대로)

  const order = shuffle(allCells);
  let removedCount = 0;

  for (let i = 0; i < order.length; i++) {
    const cell = order[i];
    const prevValue = cell.value;
    cell.isGiven = false;
    cell.value = null;

    let keep = isLogicSolvable(board);
    if (keep) {
      const { count, capped } = countSolutions(board, { cap: 2, turntableRegions });
      keep = !capped && count === 1; // capped(노드 상한 초과)는 유일성 미확인 → 안전하게 제거 취소
    }

    if (keep) {
      removedCount++;
    } else {
      cell.value = prevValue;
      cell.isGiven = true;
    }

    if ((i + 1) % chunkSize === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }

  return { removedCount, totalCandidates: order.length };
}
