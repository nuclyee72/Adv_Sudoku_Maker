/** consecutive.js — stage.consecutives를 Consecutive 구조체 배열로 만든다. */
import { Consecutive } from '../../structures/Consecutive.js';

export function buildConsecutives(stage) {
  return (stage.consecutives ?? []).map(({ a, b }) => new Consecutive(a, b));
}
