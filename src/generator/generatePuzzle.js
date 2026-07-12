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

const MAX_ATTEMPTS = 8;

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

  if (!fillRandomSolution(board)) return null; // 해 채우기 실패 — 전체 재시도

  const { structures: ruleStructures, turntables } = deriveRuleStructures(board, rules, snakeWalks, turntableOrigins);
  board.addStructures(ruleStructures);

  const excludedKeys = reservedKeys;
  await carveGivens(board, { excludedKeys, turntableRegions: turntables });

  const scrambleByOrigin = new Map(
    turntables.map(t => [`${t.originRow},${t.originCol}`, scrambledTurntableGrid(board, t)])
  );
  const turntableOf = (row, col) => turntables.find(t =>
    row >= t.originRow && row < t.originRow + t.size && col >= t.originCol && col < t.originCol + t.size);

  const givens = [];
  for (const cell of board.getVisibleCells()) {
    if (!cell.isGiven) continue;
    const owner = turntableOf(cell.row, cell.col);
    if (!owner) {
      givens.push({ row: cell.row, col: cell.col, value: cell.value });
      continue;
    }
    const grid = scrambleByOrigin.get(`${owner.originRow},${owner.originCol}`);
    const value = grid[cell.row - owner.originRow][cell.col - owner.originCol];
    givens.push({ row: cell.row, col: cell.col, value });
  }

  return {
    id: `${template.id}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    name: template.label,
    structures: board.structures,
    givens,
  };
}

export async function generatePuzzle(template) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const result = await tryGenerate(template);
    if (result) return result;
  }
  throw new Error(`퍼즐 생성 실패: ${template.label ?? template.id} (재시도 초과)`);
}
