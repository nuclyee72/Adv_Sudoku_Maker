/**
 * playerColors.js — 협동 모드에서 참가자별 커서/채운사람 마커에 쓰는 고정 팔레트.
 * 서버가 각 참가자에게 부여하는 colorIndex(참가 순서, 0~9)로 조회한다.
 */
export const PLAYER_COLORS = [
  '#e53e3e', '#dd6b20', '#d69e2e', '#38a169', '#2f9e60',
  '#3182ce', '#2b6cb0', '#805ad5', '#d53f8c', '#718096',
];

export function colorForIndex(colorIndex) {
  return PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
}
