/**
 * deriveRules.js — template.rules를 실제 Structure 인스턴스로 바꾼다.
 * inequality/consecutive는 완성된 해의 실제 값을 보고 사후에 뽑고(항상 만족 가능),
 * snake는 해를 채우기 "전에" 값을 먼저 못박아야 하므로 별도 진입점(prefillSnakeWalks)으로 분리.
 * turntable은 규칙 자체는 없지만, 표시용 스크램블 회전량을 여기서 같이 정한다.
 */
import { Inequality } from '../structures/Inequality.js';
import { Consecutive } from '../structures/Consecutive.js';
import { Snake } from '../structures/Snake.js';
import { Turntable } from '../structures/Turntable.js';
import { pickSnakeWalk } from './snakeWalk.js';
import { rotateGrid } from './gridRotate.js';
import { shuffle, randInt } from './random.js';

function inRegion(region, row, col) {
  return row >= region.row && row < region.row + region.height &&
         col >= region.col && col < region.col + region.width;
}

function adjacentPairsInRegion(board, region) {
  const cellsInRegion = board.getVisibleCells().filter(c => inRegion(region, c.row, c.col));
  const set = new Set(cellsInRegion.map(c => `${c.row},${c.col}`));
  const pairs = [];
  for (const cell of cellsInRegion) {
    const right = { row: cell.row, col: cell.col + 1 };
    const down = { row: cell.row + 1, col: cell.col };
    if (set.has(`${right.row},${right.col}`)) pairs.push([{ row: cell.row, col: cell.col }, right]);
    if (set.has(`${down.row},${down.col}`)) pairs.push([{ row: cell.row, col: cell.col }, down]);
  }
  return pairs;
}

function coverageCount(total, coverage = {}) {
  if (coverage.count) {
    const [min, max] = coverage.count;
    return Math.min(randInt(min, max), total);
  }
  return Math.round(total * (coverage.ratio ?? 0.3));
}

function readGrid(board, originRow, originCol, size) {
  const grid = [];
  for (let r = 0; r < size; r++) {
    grid.push([]);
    for (let c = 0; c < size; c++) grid[r].push(board.getCell(originRow + r, originCol + c).value);
  }
  return grid;
}

/** snake 규칙들의 경로/값을 해 채우기 전에 먼저 확정한다. 실패하면 null(호출 쪽에서 전체 재시도). */
export function prefillSnakeWalks(board, rules) {
  const walks = [];
  for (const rule of rules) {
    if (rule.type !== 'snake') continue;
    const walk = pickSnakeWalk(board, rule.region, rule.length ?? [4, 7]);
    if (!walk) return null;
    walks.push({ rule, walk });
  }
  return walks;
}

function pickTurntableOrigin(board, rule) {
  const size = rule.size;
  const { row, col, height, width } = rule.region;
  const candidates = [];
  for (let r = row; r <= row + height - size; r++) {
    for (let c = col; c <= col + width - size; c++) {
      let allVisible = true;
      for (let dr = 0; dr < size && allVisible; dr++) {
        for (let dc = 0; dc < size && allVisible; dc++) {
          const cell = board.getCell(r + dr, c + dc);
          if (!cell || !cell.isVisible) allVisible = false;
        }
      }
      if (allVisible) candidates.push({ row: r, col: c });
    }
  }
  return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
}

/**
 * 완성된 해(board 전체가 채워진 상태) + snake 사전 경로들을 보고 실제 규칙 구조체를 만든다.
 * 반환: { structures, turntables: [{originRow,originCol,size,scrambleSteps}] }
 * turntables는 이후 countSolutions의 회전 분기, 최종 결과 조립의 스크램블 표시에 쓰인다.
 */
export function deriveRuleStructures(board, rules, snakeWalks) {
  const structures = [];
  const turntables = [];

  for (const rule of rules) {
    if (rule.type === 'inequality') {
      const pairs = adjacentPairsInRegion(board, rule.region);
      const n = coverageCount(pairs.length, rule.coverage);
      for (const [a, b] of shuffle(pairs).slice(0, n)) {
        const va = board.getCell(a.row, a.col).value;
        const vb = board.getCell(b.row, b.col).value;
        structures.push(new Inequality(a, b, va > vb ? 'a' : 'b'));
      }
    } else if (rule.type === 'consecutive') {
      const pairs = adjacentPairsInRegion(board, rule.region)
        .filter(([a, b]) => Math.abs(board.getCell(a.row, a.col).value - board.getCell(b.row, b.col).value) === 1);
      const n = coverageCount(pairs.length, rule.coverage);
      for (const [a, b] of shuffle(pairs).slice(0, n)) structures.push(new Consecutive(a, b));
    } else if (rule.type === 'snake') {
      const found = snakeWalks.find(w => w.rule === rule);
      if (found) structures.push(new Snake(found.walk.cells, found.walk.start));
    } else if (rule.type === 'turntable') {
      const origin = pickTurntableOrigin(board, rule);
      if (!origin) continue;
      const turntable = new Turntable(origin.row, origin.col, rule.size);
      structures.push(turntable);
      turntables.push({
        originRow: origin.row,
        originCol: origin.col,
        size: rule.size,
        scrambleSteps: randInt(1, 3), // 0(무회전)은 스크램블이 아니므로 제외
      });
    }
  }

  return { structures, turntables };
}

/** 턴테이블 영역의 진짜 값을 스크램블 회전(표시용)으로 바꾼 grid를 돌려준다. */
export function scrambledTurntableGrid(board, turntable) {
  const grid = readGrid(board, turntable.originRow, turntable.originCol, turntable.size);
  return rotateGrid(grid, turntable.scrambleSteps);
}
