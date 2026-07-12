/** inequality.js — stage.inequalities를 Inequality 구조체 배열로 만든다. */
import { Inequality } from '../../structures/Inequality.js';

export function buildInequalities(stage) {
  return (stage.inequalities ?? []).map(({ a, b, greater }) => new Inequality(a, b, greater));
}
