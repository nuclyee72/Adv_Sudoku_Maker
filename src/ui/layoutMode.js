/**
 * layoutMode.js — 데스크톱 / 모바일(세로·가로) 레이아웃 모드 판별
 *
 * 여기 두 breakpoint는 style.css의 @media 쿼리와 반드시 같은 값을 써야 한다
 * (보드/키패드/플로팅 패널은 JS가 인라인 style.left/top을 직접 쓰기 때문에,
 * CSS만으로는 이 판별과 어긋나는 순간 위치 계산이 깨진다). 값을 바꿀 땐 두 곳을 같이 바꿀 것.
 *   - 세로: (max-width: 640px) and (orientation: portrait)
 *   - 가로: (max-height: 500px) and (orientation: landscape)
 */
const PORTRAIT_MQ  = window.matchMedia('(max-width: 640px) and (orientation: portrait)');
const LANDSCAPE_MQ = window.matchMedia('(max-height: 500px) and (orientation: landscape)');

function computeLayoutMode() {
  if (PORTRAIT_MQ.matches)  return 'mobile-portrait';
  if (LANDSCAPE_MQ.matches) return 'mobile-landscape';
  return 'desktop';
}

/** 'desktop' | 'mobile-portrait' | 'mobile-landscape' — 실제 전환이 있을 때만 갱신됨 */
export let layoutMode = computeLayoutMode();

export function isMobile() {
  return layoutMode !== 'desktop';
}

const listeners = new Set();

/** 레이아웃 모드가 실제로 바뀔 때만 fn(layoutMode)를 호출. 구독 해제 함수를 반환. */
export function onLayoutChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function applyLayoutMode(next) {
  if (next === layoutMode) return;
  layoutMode = next;
  document.documentElement.setAttribute('data-layout', layoutMode);
  for (const fn of listeners) fn(layoutMode);
}

document.documentElement.setAttribute('data-layout', layoutMode);

// matchMedia는 대부분의 브라우저에서 리사이즈/방향전환 시 즉시 change를 발화한다.
PORTRAIT_MQ.addEventListener('change', () => applyLayoutMode(computeLayoutMode()));
LANDSCAPE_MQ.addEventListener('change', () => applyLayoutMode(computeLayoutMode()));

// 보조 경로: iOS는 주소창 표시/숨김만으로도 resize를 여러 번 튀길 수 있어 짧게 디바운스한다.
let debounceTimer = null;
function scheduleRecompute() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => applyLayoutMode(computeLayoutMode()), 120);
}
window.addEventListener('resize', scheduleRecompute);
window.addEventListener('orientationchange', scheduleRecompute);
