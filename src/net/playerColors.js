/**
 * playerColors.js — 협동 모드에서 참가자별 커서/채운사람 마커에 쓰는 고정 팔레트.
 * 서버가 각 참가자에게 부여하는 colorIndex(참가 순서, 0~9)로 조회한다.
 */
export const PLAYER_COLORS = [
  '#f28b82', '#ffb37c', '#f5d06f', '#93d9a5', '#7fdbca',
  '#8ecbef', '#9fb4f2', '#c6a8f0', '#f5a8c9', '#b9c2cf',
];

export function colorForIndex(colorIndex) {
  return PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
}
