/** turntable.js — stage.turntables를 Turntable 구조체 배열로 만든다. */
import { Turntable } from '../../structures/Turntable.js';

export function buildTurntables(stage) {
  return (stage.turntables ?? []).map(({ originRow, originCol, size }) => new Turntable(originRow, originCol, size));
}
