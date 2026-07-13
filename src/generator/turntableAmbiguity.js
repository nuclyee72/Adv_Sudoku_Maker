/**
 * turntableAmbiguity.js — 턴테이블 회전 "그럴듯함" 보정.
 * 캐빙이 끝난 직후, 턴테이블 4방향 중 지금 보이는 given 값만으로 즉시 모순 없이 통하는
 * 방향이 1개뿐이면(나머지 3개는 척 보기만 해도 틀렸다는 걸 알 수 있으면) 돌려서 맞추는
 * 재미가 사라진다 — 안 그래도 정답인 방향을 아는 셈이니 회전 기믹이 무의미해진다.
 * 턴테이블 자신의 칸과 그 바깥 row/col/box 이웃 중 일부를 유일해가 깨지지 않는 선에서
 * 추가로 지워서, 최소 두 방향은 "그럴듯해" 보이게(=즉시 모순나지 않게) 만든다.
 */
import { countSolutions, makeCheckers } from './backtrack.js';
import { scrambledTurntableGrid } from './deriveRules.js';
import { key } from './peerIndex.js';
import { shuffle } from './random.js';

/**
 * 지금 보이는 given만으로 즉시 통하는(=row/col/box peer, 부가 구조체와 충돌 없는) 회전이
 * 몇 개인지 센다. 빈 칸은 아직 안 보이니 어떤 값이 와도 상관없어 항상 통과로 취급한다.
 */
export function countPlausibleRotations(board, turntable, checkers) {
  const { usedMask, extraOk } = checkers;
  const { originRow, originCol, size } = turntable;
  const cells = [];
  for (let r = 0; r < size; r++) {
    cells.push([]);
    for (let c = 0; c < size; c++) cells[r].push(board.getCell(originRow + r, originCol + c));
  }

  let plausible = 0;
  for (let rot = 0; rot < 4; rot++) {
    const { values, givens } = scrambledTurntableGrid(board, { originRow, originCol, size, scrambleSteps: rot });
    const backup = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = cells[r][c];
        backup.push({ cell, value: cell.value });
        cell.value = givens[r][c] ? values[r][c] : null;
      }
    }
    const valid = backup.every(({ cell }) => cell.value === null || (!(usedMask(cell) & (1 << cell.value)) && extraOk(cell)));
    if (valid) plausible++;
    for (const { cell, value } of backup) cell.value = value; // 다음 회전 계산 전 반드시 복구
  }
  return plausible;
}

/**
 * turntables 배열의 각 턴테이블마다 그럴듯한 방향이 minPlausible개 이상 되도록, 턴테이블
 * 자신의 칸 + row/col/box로 이어진 바깥 이웃 중 given인 칸을 무작위 순서로 하나씩 지워본다.
 * 지워서 유일해가 깨지면 되돌리고, 그대로 유일하면 지운 채로 둔다(그럴듯함이 실제로
 * 나아졌는지는 다음 후보로 넘어가기 전 다시 잰다). 시간 예산을 넘기거나 후보가 떨어지면
 * 그 턴테이블은 포기하고 다음으로 넘어간다 — 완벽히 못 고쳐도 생성 실패는 아니다.
 */
export async function relaxTurntableAmbiguity(board, turntables, { minPlausible = 2, nodeCap = 30000, timeBudgetMs = 6000, chunkSize = 8 } = {}) {
  if (!turntables.length) return;

  const checkers = makeCheckers(board);
  const deadline = Date.now() + timeBudgetMs;
  let checksSinceYield = 0;

  for (const turntable of turntables) {
    if (Date.now() > deadline) break;
    if (countPlausibleRotations(board, turntable, checkers) >= minPlausible) continue;

    const candidateKeys = new Set();
    for (let r = 0; r < turntable.size; r++) {
      for (let c = 0; c < turntable.size; c++) {
        const row = turntable.originRow + r, col = turntable.originCol + c;
        candidateKeys.add(key(row, col));
        for (const peerKey of checkers.peerIndex.get(key(row, col)) ?? []) candidateKeys.add(peerKey);
      }
    }

    const candidates = shuffle([...candidateKeys])
      .map(k => { const [row, col] = k.split(',').map(Number); return board.getCell(row, col); })
      .filter(cell => cell && cell.isGiven);

    for (const cell of candidates) {
      if (Date.now() > deadline) break;
      if (countPlausibleRotations(board, turntable, checkers) >= minPlausible) break;

      const prevValue = cell.value;
      cell.isGiven = false;
      cell.value = null;
      const { count, capped } = countSolutions(board, { cap: 2, turntableRegions: turntables, nodeCap, checkers });
      if (capped || count !== 1) {
        cell.value = prevValue;
        cell.isGiven = true;
      }

      // countSolutions는 비싸질 수 있어(어려움 난이도, 큰 턴테이블) 탭이 안 멈추게 주기적으로 양보한다.
      if (++checksSinceYield >= chunkSize) {
        checksSinceYield = 0;
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }
}
