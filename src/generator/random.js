/** random.js — 생성기 전역에서 쓰는 랜덤 유틸. */
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function randInt(minInclusive, maxInclusive) {
  return minInclusive + Math.floor(Math.random() * (maxInclusive - minInclusive + 1));
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
