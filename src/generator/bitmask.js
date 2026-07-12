/** bitmask.js — 1~9 숫자 후보를 비트마스크(bit i = 숫자 i)로 다루는 공용 헬퍼. */
export const FULL_MASK = 0b1111111110;

export function popcount(mask) {
  let n = 0;
  while (mask) { mask &= mask - 1; n++; }
  return n;
}

export function bitsOf(mask) {
  const bits = [];
  for (let v = 1; v <= 9; v++) if (mask & (1 << v)) bits.push(v);
  return bits;
}
