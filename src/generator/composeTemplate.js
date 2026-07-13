/**
 * composeTemplate.js — "모양 + 요소 + 난이도" 선택을 generatePuzzle()이 바로 먹을 수 있는
 * template 객체({id,label,boards,rules,difficulty})로 합성한다.
 * generatePuzzle()은 template.boards/rules/id/label만 읽으므로 정적 파일일 필요가 없다.
 */
import { shapes, getShape } from './shapes.js';
import { shuffle, pick, randInt } from './random.js';

export const ELEMENT_KEYS = ['inequality', 'consecutive', 'snake', 'turntable'];
export const DIFFICULTIES = ['easy', 'normal', 'hard'];

export const ELEMENT_LABELS = { inequality: '부등호', consecutive: '연속', snake: '스네이크', turntable: '턴테이블' };
export const DIFFICULTY_LABELS = { easy: '쉬움', normal: '보통', hard: '어려움' };

// random까지 명시적으로 false로 채워둔다 — 이게 빠지면 UI 쪽 classList.toggle(cls, elements.random)이
// undefined를 받아 "강제 false"가 아니라 "그냥 토글"로 동작해서 랜덤 버튼이 엉뚱하게 켜져 보인다.
function emptyElements() {
  return { inequality: false, consecutive: false, snake: false, turntable: false, random: false };
}

/**
 * 모양/요소의 "랜덤" 선택을 이 시점에 한 번 확정한다 — 이후 인코딩/조립은 이 결과를
 * 그대로 재사용해서, 같은 방의 다른 참가자도 동일한 값을 보게 된다.
 */
export function resolveRandomSelection({ shapeId, elements = {}, difficulty = 'normal' } = {}) {
  const resolvedShapeId = shapeId === 'random' ? pick(shapes).id : shapeId;

  let resolvedElements;
  if (elements.random) {
    resolvedElements = emptyElements();
    for (const key of ELEMENT_KEYS) resolvedElements[key] = Math.random() < 0.5;
  } else {
    resolvedElements = { ...emptyElements() };
    for (const key of ELEMENT_KEYS) resolvedElements[key] = !!elements[key];
  }

  const resolvedDifficulty = DIFFICULTIES.includes(difficulty) ? difficulty : 'normal';

  return { shapeId: resolvedShapeId, elements: resolvedElements, difficulty: resolvedDifficulty };
}

export function encodeSelectionId(resolved) {
  const keys = ELEMENT_KEYS.filter(k => resolved.elements[k]);
  return `custom:${resolved.shapeId}:${keys.length ? keys.join(',') : 'none'}:${resolved.difficulty}`;
}

export function decodeSelectionId(id) {
  if (typeof id !== 'string' || !id.startsWith('custom:')) return null;
  const [, shapeId, elementsPart, difficulty] = id.split(':');
  if (!shapeId || !elementsPart || !difficulty) return null;
  if (!getShape(shapeId)) return null;
  const elements = emptyElements();
  if (elementsPart !== 'none') {
    for (const key of elementsPart.split(',')) {
      if (ELEMENT_KEYS.includes(key)) elements[key] = true;
    }
  }
  if (!DIFFICULTIES.includes(difficulty)) return null;
  return { shapeId, elements, difficulty };
}

export function describeSelection(resolved) {
  const shape = getShape(resolved.shapeId);
  const elementLabels = ELEMENT_KEYS.filter(k => resolved.elements[k]).map(k => ELEMENT_LABELS[k]);
  const elementsText = elementLabels.length ? elementLabels.join('+') : '요소 없음';
  return `${shape?.label ?? resolved.shapeId} · ${elementsText} · ${DIFFICULTY_LABELS[resolved.difficulty]}`;
}

function boundingRegion(boards) {
  const minRow = Math.min(...boards.map(b => b.row));
  const minCol = Math.min(...boards.map(b => b.col));
  const maxRow = Math.max(...boards.map(b => b.row + 9));
  const maxCol = Math.max(...boards.map(b => b.col + 9));
  return { row: minRow, col: minCol, height: maxRow - minRow, width: maxCol - minCol };
}

// 스네이크 길이, 턴테이블 크기 범위 — 난이도가 높을수록 위쪽 한계가 늘어나 더 길거나 큰
// 것도 "나올 수 있게"만 한다(항상 그렇게 되는 건 아니고 매번 범위 안에서 무작위).
// 턴테이블은 4x4까지만 — 5x5는 회전 손잡이 조작이 너무 부담스러워 최대 크기를 낮췄다.
const SNAKE_LENGTH_RANGES = { easy: [5, 7], normal: [7, 10], hard: [10, 13] };
const TURNTABLE_SIZE_RANGES = { easy: [3, 3], normal: [3, 4], hard: [3, 4] };

/**
 * 보드 개수와 난이도에 비례해 스네이크를 몇 개 배치할지 정한다 — 쉬움은 최소(1개),
 * 보통은 보드 절반쯤, 어려움은 보드 수만큼(모든 보드에 하나씩). 보드당 최대 1개까지만
 * 배치해서, 같은 종류의 규칙끼리는 애초에 같은 보드를 두고 다툴 일이 없게 한다(다른
 * 보드끼리 3x3 모서리를 공유하는 경우의 충돌은 prefillSnakeWalks가 이미 배치한 자리를
 * reservedKeys로 피해가며 처리한다).
 */
function scaledSnakeCount(boardCount, difficulty) {
  if (difficulty === 'easy') return 1;
  if (difficulty === 'normal') return Math.max(1, Math.ceil(boardCount / 2));
  return boardCount; // hard
}

/**
 * 턴테이블 개수는 스네이크보다 한 단계 적게 — 보드마다 다 돌리게 하면 피로감이 커서
 * (회전 하나하나가 스네이크 칸 하나보다 손이 더 감) 쉬움/보통은 1개로 묶어두고,
 * 어려움만 보드 절반쯤으로 늘린다.
 */
function scaledTurntableCount(boardCount, difficulty) {
  if (difficulty === 'hard') return Math.max(1, Math.ceil(boardCount / 2));
  return 1; // easy/normal
}

export function buildTemplateFromSelection(resolved) {
  const shape = getShape(resolved.shapeId);
  if (!shape) throw new Error(`알 수 없는 모양: ${resolved.shapeId}`);
  const boards = shape.boards;
  const region = boundingRegion(boards);
  const rules = [];

  if (resolved.elements.inequality) {
    rules.push({ type: 'inequality', region, coverage: { ratio: 0.25 } });
  }
  if (resolved.elements.consecutive) {
    rules.push({ type: 'consecutive', region, coverage: { ratio: 0.5 } });
  }
  if (resolved.elements.snake) {
    const count = scaledSnakeCount(boards.length, resolved.difficulty);
    const lengthRange = SNAKE_LENGTH_RANGES[resolved.difficulty];
    for (const board of shuffle([...boards]).slice(0, count)) {
      rules.push({ type: 'snake', region: { row: board.row, col: board.col, height: 9, width: 9 }, length: lengthRange });
    }
  }
  if (resolved.elements.turntable) {
    const count = scaledTurntableCount(boards.length, resolved.difficulty);
    const [minSize, maxSize] = TURNTABLE_SIZE_RANGES[resolved.difficulty];
    for (const board of shuffle([...boards]).slice(0, count)) {
      const size = randInt(minSize, maxSize);
      rules.push({ type: 'turntable', region: { row: board.row, col: board.col, height: 9, width: 9 }, size });
    }
  }

  return {
    id: encodeSelectionId(resolved),
    label: describeSelection(resolved),
    boards,
    rules,
    difficulty: resolved.difficulty,
  };
}
