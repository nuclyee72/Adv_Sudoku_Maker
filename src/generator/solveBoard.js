/**
 * solveBoard.js — structures/givens만으로 완성해를 계산한다. 브라우저(싱글플레이 정답
 * 체크/보기)와 서버(협동 모드, DOM 의존 없음) 양쪽에서 그대로 import해서 쓴다.
 */
import { Board } from '../core/Board.js';
import { fillRandomSolution } from './backtrack.js';

/**
 * 턴테이블 칸의 given은 "지금 화면에 스크램블(회전)된 채로 보이는" 값이라 그 좌표에 그대로
 * 고정하면 row/col/box 제약과 안 맞을 수 있다(애초에 회전을 맞추는 것 자체가 퍼즐의 일부라,
 * 초기 화면은 일부러 정답이 아닌 회전으로 보여준다). 정답 체크/보기 기능은 turntable 칸을
 * 아예 대상에서 제외하므로, 여기서도 그 칸들은 given으로 고정하지 않고 자유 칸으로 남겨
 * 나머지 칸 backtracking에 잘못된 제약을 주지 않게 한다.
 */
async function solveOnce(structures, givens) {
  const board = new Board();
  board.addStructures(structures);
  const turntableKeys = board.getTurntableCellKeys();
  board.loadGivens(givens.filter((g) => !turntableKeys.has(`${g.row},${g.col}`)));

  const ok = await fillRandomSolution(board);
  if (!ok) return null;

  const solution = new Map();
  for (const cell of board.getVisibleCells()) {
    const key = `${cell.row},${cell.col}`;
    if (turntableKeys.has(key)) continue;
    solution.set(key, cell.value);
  }
  return solution;
}

/**
 * generatePuzzle()이 만든 퍼즐은 캐빙 전(모든 칸이 진짜 정답을 갖고 있을 때) 뜬 정답
 * 스냅샷을 함께 내려주므로 이 함수를 거칠 필요가 없다 — 이 함수는 그런 정답이 없는 퍼즐
 * (예: structures/givens만 있는 레거시 수록 퍼즐)에 대한 최선 노력(best-effort) 대안이다.
 * 턴테이블이 있으면 그 영역을 자유 칸으로 남기고 풀기 때문에(위 solveOnce 참고), 아주 드물게
 * 그 자유도가 턴테이블 밖 칸까지 유일하지 않게 만들 수 있다 — 두 번 풀어서 일치하는지
 * 검증하고, 한 번이라도 어긋나면 신뢰할 수 없는 것으로 보고 null을 반환한다(정답 체크/보기가
 * "계산 실패"로 처리해 잘못된 정답을 보여주지 않게 한다).
 * @returns {Promise<Map<string, number>|null>} "row,col" -> 정답값(턴테이블 칸 제외). 못 풀거나 못 미더우면 null.
 */
export async function solveBoard(structures, givens) {
  const first = await solveOnce(structures, givens);
  if (!first) return null;
  const second = await solveOnce(structures, givens);
  if (!second) return null;
  for (const [key, value] of first) {
    if (second.get(key) !== value) return null;
  }
  return first;
}
