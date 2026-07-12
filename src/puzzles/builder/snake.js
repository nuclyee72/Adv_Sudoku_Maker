/** snake.js — stage.snakes를 Snake 구조체 배열로 만든다. */
import { Snake } from '../../structures/Snake.js';

export function buildSnakes(stage) {
  return (stage.snakes ?? []).map(({ cells, start }) => new Snake(cells, start));
}
