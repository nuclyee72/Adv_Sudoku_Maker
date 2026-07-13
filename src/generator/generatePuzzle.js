/**
 * generatePuzzle.js — 템플릿 → { id, name, structures, givens } 오케스트레이션.
 * buildPuzzle()과 반환 형태를 맞춰서 main.js의 loadPuzzle()이 그대로 재사용되게 한다.
 */
import { Board } from '../core/Board.js';
import { createStandardSudokuStructures } from '../structures/StandardSudoku.js';
import { dedupStructures } from '../puzzles/builder/index.js';
import { fillRandomSolution } from './backtrack.js';
import {
  pickTurntableOrigins, turntableReservedKeys,
  prefillSnakeWalks, deriveRuleStructures, scrambledTurntableGrid,
} from './deriveRules.js';
import { carveGivens } from './carveGivens.js';
import { relaxTurntableAmbiguity } from './turntableAmbiguity.js';
import { isLogicSolvable } from './logicSolver.js';

const MAX_ATTEMPTS = 20;
// 보드 개수/규칙이 많은 조합(예: 4보드 + 전체 요소 + 어려움)은 시도당 소요 시간 편차가 커서
// 고정 횟수만으로는 총 소요 시간을 가늠할 수 없다 — 전체 생성에 쓸 수 있는 총 시간을 못박아
// 두고, 그 안에서 될 때까지(또는 MAX_ATTEMPTS까지) 재시도한다.
const GENERATE_TIME_BUDGET_MS = 30000;
const EASY_RESTORE_RATIO = 0.35; // "쉬움" 난이도: 지운 칸 중 이 비율만큼 다시 given으로 복원

async function tryGenerate(template) {
  const board = new Board();
  const structures = dedupStructures(
    template.boards.flatMap(({ row, col }) => createStandardSudokuStructures(row, col))
  );
  board.addStructures(structures);

  const rules = template.rules ?? [];

  // turntable 배치는 값과 무관한 순수 기하 문제라 가장 먼저 정한다 — snake가 그 칸을
  // 침범하면 "항상 given+회전 미지수"와 "일반 칸"이 동시에 성립할 수 없기 때문.
  const turntableOrigins = pickTurntableOrigins(board, rules);
  if (turntableOrigins === null) return null; // 자리 못 찾음 — 전체 재시도
  const reservedKeys = turntableReservedKeys(turntableOrigins);

  const snakeWalks = prefillSnakeWalks(board, rules, reservedKeys);
  if (snakeWalks === null) return null; // 경로를 못 뽑음 — 전체 재시도

  if (!(await fillRandomSolution(board))) return null; // 해 채우기 실패 — 전체 재시도

  const { structures: ruleStructures, turntables } = deriveRuleStructures(board, rules, snakeWalks, turntableOrigins);
  board.addStructures(ruleStructures);

  const difficulty = template.difficulty ?? 'normal';
  const carveOptions = difficulty === 'hard'
    // "어려움"은 naked/hidden single 게이트를 끄기 때문에 매 후보가 비싼 유일해 검사까지
    // 가는데, 클루가 줄수록 그 검사 자체가 기하급수적으로 비싸진다 — nodeCap을 줄이고
    // 전체 캐빙에 시간 예산을 둬서 그 폭주를 막는다(예산 초과분은 안전하게 given으로 남음).
    ? { turntableRegions: turntables, requireLogicSolvable: false, nodeCap: 20000, timeBudgetMs: 4000 }
    : { turntableRegions: turntables, requireLogicSolvable: true };
  const { removedCells } = await carveGivens(board, carveOptions);

  if (difficulty === 'easy') {
    // 무작위 대신 "가장 나중에 지워진" 칸부터 되돌린다 — removedCells는 캐빙 루프가 지운
    // 순서 그대로 쌓이므로, 뒤쪽일수록 이미 다른 칸이 많이 지워진 빠듯한 상태에서 지워진
    // 칸(=복구하기 가장 어려운 칸)이다. 무작위 복원은 어려운 지점을 그대로 남겨둘 수 있지만,
    // 이렇게 하면 실제로 어려운 지점부터 겨냥해서 낮출 수 있다.
    const restoreCount = Math.round(removedCells.length * EASY_RESTORE_RATIO);
    if (restoreCount > 0) { // slice(-0)은 slice(0)과 같아서 전체를 복원해버리므로 반드시 방어
      for (const { cell, value } of removedCells.slice(-restoreCount)) {
        cell.isGiven = true;
        cell.value = value;
      }
    }
  } else if (difficulty === 'hard' && isLogicSolvable(board)) {
    // 게이트를 끄고 공격적으로 지웠는데도 우연히 naked/hidden single만으로 다 풀려버리면
    // "어려움"이 사실상 "보통"과 다를 게 없어진다 - 통째로 재시도(다른 무작위 해/캐빙
    // 순서로 다시 시도하면 보통 이 상황을 피해간다).
    return null;
  }

  // 회전 없이도 정답 방향이 뻔히 보이면(4방향 중 그럴듯한 게 1개뿐이면) 턴테이블이
  // 장식으로 전락한다 — 난이도와 무관하게 항상 보정한다.
  await relaxTurntableAmbiguity(board, turntables);

  const scrambleByOrigin = new Map(
    turntables.map(t => [`${t.originRow},${t.originCol}`, scrambledTurntableGrid(board, t)])
  );
  const turntableOf = (row, col) => turntables.find(t =>
    row >= t.originRow && row < t.originRow + t.size && col >= t.originCol && col < t.originCol + t.size);

  const givens = [];
  for (const cell of board.getVisibleCells()) {
    const owner = turntableOf(cell.row, cell.col);
    if (!owner) {
      if (!cell.isGiven) continue;
      givens.push({ row: cell.row, col: cell.col, value: cell.value });
      continue;
    }
    // 턴테이블 소유 칸은 캐빙이 정한 given/blank가 "회전 0" 기준이라, cell.isGiven을 직접
    // 보는 대신 스크램블 회전이 반영된 givens grid로 이 좌표가 (표시상) given인지 판단한다.
    const { values, givens: givenGrid } = scrambleByOrigin.get(`${owner.originRow},${owner.originCol}`);
    const r = cell.row - owner.originRow, c = cell.col - owner.originCol;
    if (!givenGrid[r][c]) continue;
    givens.push({ row: cell.row, col: cell.col, value: values[r][c] });
  }

  return {
    id: `${template.id}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    name: template.label,
    structures: board.structures,
    givens,
    // 난이도를 "라벨"이 아니라 측정된 값으로도 남겨둔다(지금은 UI에 안 쓰지만 추후 조정/표시에 재사용 가능)
    stats: { givenCount: givens.length, totalCells: board.getVisibleCells().length },
  };
}

export async function generatePuzzle(template) {
  const deadline = Date.now() + GENERATE_TIME_BUDGET_MS;
  for (let attempt = 0; attempt < MAX_ATTEMPTS && Date.now() < deadline; attempt++) {
    const result = await tryGenerate(template);
    if (result) return result;
  }
  throw new Error(`퍼즐 생성 실패: ${template.label ?? template.id} (재시도 초과)`);
}
