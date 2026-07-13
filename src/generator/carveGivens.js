/**
 * carveGivens.js — 완성된 해에서 클루를 최대한 제거한다.
 * 클루를 지우는 건 제약을 "느슨하게" 만드는 것뿐이라, 어떤 칸을 지웠을 때 해가 여러 개가
 * 되면 그 뒤로 다른 칸을 더 지워도(제약이 더 느슨해질 뿐이므로) 절대 다시 유일해질 수 없다.
 * 그래서 무작위 순서로 한 바퀴만 돌면서 "지금 상태에서 이 칸을 지워도 되는가"만 판정하면
 * 충분하고, 여러 번 훑을 필요가 없다.
 */
import { countSolutions, makeCheckers } from './backtrack.js';
import { isLogicSolvable } from './logicSolver.js';
import { key } from './peerIndex.js';
import { shuffle } from './random.js';

/**
 * 턴테이블 칸 + 그 바깥 row/col/box 이웃 좌표 집합. 이 칸들을 캐빙 순서 맨 앞에 둬서,
 * "아직 다른 칸이 별로 안 지워져서 여유가 많을 때" 먼저 지워볼 기회를 준다 — 순서상 뒤로
 * 갈수록(다른 칸이 이미 많이 지워질수록) 남은 칸 하나하나가 유일해를 지탱하는 비중이 커져서
 * 지워질 확률이 낮아지기 때문에, 턴테이블 주변을 뒤로 미루면 사실상 못 지워진다.
 */
function turntablePriorityKeys(peerIndex, turntableRegions) {
  const keys = new Set();
  if (!turntableRegions.length) return keys;
  for (const t of turntableRegions) {
    for (let r = 0; r < t.size; r++) {
      for (let c = 0; c < t.size; c++) {
        const row = t.originRow + r, col = t.originCol + c;
        keys.add(key(row, col));
        for (const peerKey of peerIndex.get(key(row, col)) ?? []) keys.add(peerKey);
      }
    }
  }
  return keys;
}

/**
 * board: 모든 보이는 칸이 정답값으로 채워져 있고, 규칙 구조체(부등호/연속/스네이크/턴테이블)까지
 * 다 붙은 상태여야 한다. 턴테이블 영역 칸도 다른 칸과 똑같이 제거를 시도한다 — 회전 방향과
 * 남은 빈 칸 값을 함께 추리해야 유일해가 되는지는 countSolutions(turntableRegions)가 판정한다.
 * requireLogicSolvable=false면 naked/hidden single 게이트를 건너뛰고 유일해만 요구한다 —
 * "어려움" 난이도가 더 공격적으로 클루를 지우기 위한 스위치(호출 쪽이 결정).
 *
 * isLogicSolvable은 값 하나가 확정되는 순간 즉시 false를 반환하는 값싼 검사라, 평소(게이트 켜짐)엔
 * 클루가 어느 정도 줄면 이후 후보 대부분이 이 값싼 검사에서 곧장 걸러져 비싼 countSolutions까지
 * 거의 안 간다. 게이트를 끄면 매 후보가 예외 없이 countSolutions까지 가는데, 클루가 적을수록
 * 유일해 판정 자체가 기하급수적으로 비싸져서(스도쿠 생성기의 흔한 함정) 손대지 않으면 한 퍼즐에
 * 수 분씩 걸릴 수 있다. 또한 규칙(부등호/연속 등)이 하나도 없는 "요소 없음" 조합처럼 순수
 * 스도쿠 제약만 있는 큰 보드(보드 여러 개짜리 모양)는 부가 제약이 없는 만큼 후보 해가 많아서,
 * requireLogicSolvable이 켜져 있어도 countSolutions 자체가 느려질 수 있다 — 그래서 항상
 * nodeCap과 전체 루프 시간 예산(timeBudgetMs)을 둬서 예산을 넘으면 남은 후보는 그냥 given으로
 * 남긴다(capped/시간초과는 안전하게 "제거 취소"로 처리되므로 정확성엔 영향 없음, 그저 덜
 * 미니멀해질 뿐이다). 청크마다 잠깐 이벤트 루프에 양보해서(await) 탭이 안 멈추게 한다.
 * 턴테이블 칸과 그 이웃은 순서 맨 앞에서 먼저 지워본다(turntablePriorityKeys) — 그래야
 * "회전만으로 정답 방향이 뻔히 보이는" 턴테이블이 덜 나온다(turntableAmbiguity.js가 캐빙
 * 이후 한 번 더 보정하지만, 여유가 없는 뒷순서에서는 보정할 거리가 안 남기 쉽다).
 */
export async function carveGivens(board, {
  turntableRegions = [],
  chunkSize = 15,
  requireLogicSolvable = true,
  nodeCap = 100000,
  timeBudgetMs = 15000,
} = {}) {
  const allCells = board.getVisibleCells();
  for (const cell of allCells) cell.isGiven = true; // 시작점: 전부 given(정답값 그대로)

  // 캐빙 도중 board.structures는 절대 안 바뀌므로(칸 값만 바뀜), peer/extra 인덱스를 루프
  // 시작 전 딱 한 번만 만들어 이 함수 안에서 계속 재사용한다 — 후보 칸마다 매번 새로 만들면
  // (구조체 수 × 좌표 수) 규모의 작업이 후보 수만큼 반복돼 순수 낭비가 된다.
  const checkers = makeCheckers(board);

  const priorityKeys = turntablePriorityKeys(checkers.peerIndex, turntableRegions);
  const priorityCells = allCells.filter(c => priorityKeys.has(key(c.row, c.col)));
  const restCells = allCells.filter(c => !priorityKeys.has(key(c.row, c.col)));
  const order = [...shuffle(priorityCells), ...shuffle(restCells)];
  let removedCount = 0;
  const removedCells = [];
  const deadline = Date.now() + timeBudgetMs;

  for (let i = 0; i < order.length; i++) {
    if (Date.now() > deadline) break; // 시간 예산 초과 — 남은 후보는 그냥 given으로 유지

    const cell = order[i];
    const prevValue = cell.value;
    cell.isGiven = false;
    cell.value = null;

    let keep = requireLogicSolvable ? isLogicSolvable(board, { peerIndex: checkers.peerIndex }) : true;
    if (keep) {
      const { count, capped } = countSolutions(board, { cap: 2, turntableRegions, nodeCap, checkers });
      keep = !capped && count === 1; // capped(노드 상한 초과)는 유일성 미확인 → 안전하게 제거 취소
    }

    if (keep) {
      removedCount++;
      removedCells.push({ cell, value: prevValue });
    } else {
      cell.value = prevValue;
      cell.isGiven = true;
    }

    if ((i + 1) % chunkSize === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }

  return { removedCount, totalCandidates: order.length, removedCells };
}
