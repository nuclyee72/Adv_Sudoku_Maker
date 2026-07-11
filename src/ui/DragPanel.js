/**
 * DragPanel.js — 드래그 이동 패널
 *
 * opts.allowSVG  = true  → SVG rect/text 위에서도 드래그 시작 가능
 * opts.noZBoost  = true  → 클릭 시 z-index 변경 안 함
 * opts.clamp     = 'full'    → 패널 전체가 화면 안에 있어야 함 (기본)
 *                  'partial' → 최소 minVisible px 만큼만 화면 안에 있으면 됨
 *                  'none'    → 이동 범위 제한 없음
 * opts.minVisible = px  → 'partial' 모드에서 최소로 보여야 하는 크기 (기본 56)
 */
export class DragPanel {
  /**
   * @param {HTMLElement} panelEl
   * @param {HTMLElement} handleEl
   * @param {object}  [opts]
   * @param {boolean} [opts.allowSVG=false]
   * @param {boolean} [opts.noZBoost=false]
   * @param {'full'|'partial'|'none'} [opts.clamp='full']
   * @param {number}  [opts.minVisible=56]
   * @param {HTMLElement|SVGElement} [opts.contentEl]  - 실제 크기를 측정할 요소 (스케일 적용된 내부 요소)
   */
  constructor(panelEl, handleEl, opts = {}) {
    this.panel      = panelEl;
    this.handle     = handleEl;
    this.allowSVG   = opts.allowSVG   ?? false;
    this.noZBoost   = opts.noZBoost   ?? false;
    this.clamp      = opts.clamp      ?? 'full';
    this.minVisible = opts.minVisible ?? 56;
    this.contentEl  = opts.contentEl  || panelEl;

    this._isDrag      = false;
    this._startX      = 0;
    this._startY      = 0;
    this._offsetX     = 0;
    this._offsetY     = 0;
    this._dragEndedAt = 0;

    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp   = this._onMouseUp.bind(this);

    this.handle.addEventListener('mousedown', this._onMouseDown);
  }

  /** 이동 가능 범위 계산 */
  _bounds() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const r  = this.contentEl.getBoundingClientRect();
    const pw = r.width;
    const ph = r.height;

    if (this.clamp === 'none') {
      return { minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity };
    }

    if (this.clamp === 'partial') {
      const mv = this.minVisible;
      return {
        minX: -(pw - mv),  // 왼쪽으로 최대 (panelWidth - mv) px 나갈 수 있음
        maxX: vw - mv,     // 오른쪽으로 최대 (vw - mv) px 위치까지
        minY: -(ph - mv),
        maxY: vh - mv,
      };
    }

    // 'full' — 패널 전체가 화면 안
    return { minX: 0, maxX: vw - pw, minY: 0, maxY: vh - ph };
  }

  _applyPos(x, y) {
    const b = this._bounds();
    this.panel.style.left = `${Math.max(b.minX, Math.min(x, b.maxX))}px`;
    this.panel.style.top  = `${Math.max(b.minY, Math.min(y, b.maxY))}px`;
  }

  /** 드래그가 50ms 이내에 끝났으면 true */
  wasDragging() {
    return Date.now() - this._dragEndedAt < 50;
  }

  _onMouseDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest('button')) return;

    const isSVGEl = ['rect', 'text', 'line', 'g'].includes(e.target.tagName);
    if (!this.allowSVG && isSVGEl) return;

    this._isDrag = false;
    this._startX = e.clientX;
    this._startY = e.clientY;

    const r = this.panel.getBoundingClientRect();
    this._offsetX = e.clientX - r.left;
    this._offsetY = e.clientY - r.top;

    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup',   this._onMouseUp);

    if (!this.noZBoost) {
      window._zTop = (window._zTop || 200) + 1;
      this.panel.style.zIndex = window._zTop;
    }
  }

  _onMouseMove(e) {
    const dx = e.clientX - this._startX;
    const dy = e.clientY - this._startY;

    if (!this._isDrag && Math.hypot(dx, dy) > 5) {
      this._isDrag = true;
      this.panel.style.cursor = 'grabbing';
    }

    if (!this._isDrag) return;

    this._applyPos(e.clientX - this._offsetX, e.clientY - this._offsetY);
  }

  _onMouseUp() {
    if (this._isDrag) {
      this._dragEndedAt = Date.now();
      this.panel.style.cursor = '';
    }
    this._isDrag = false;
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup',   this._onMouseUp);
  }

  setPosition(x, y) {
    this._applyPos(x, y);
  }

  moveBy(dx, dy) {
    const r = this.panel.getBoundingClientRect();
    this._applyPos(r.left + dx, r.top + dy);
  }
}
