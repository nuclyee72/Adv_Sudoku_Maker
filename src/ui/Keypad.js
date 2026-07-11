/**
 * Keypad.js — 1~9 숫자 + 메모/지우기 버튼 키패드
 */
export class Keypad {
  constructor(containerEl, onInput, onNoteToggle) {
    this.container = containerEl;
    this.onInput = onInput;
    this.onNoteToggle = onNoteToggle;
    this._render();
  }

  _render() {
    this.container.innerHTML = '';

    for (let i = 1; i <= 9; i++) {
      const btn = document.createElement('button');
      btn.className = 'kp-btn kp-num';
      btn.textContent = i;
      btn.id = `kp-${i}`;
      btn.addEventListener('click', () => {
        this.onInput(i);
        this._flash(btn);
      });
      this.container.appendChild(btn);
    }

    const actions = document.createElement('div');
    actions.className = 'kp-row-actions';

    // 메모 버튼 (메모 모드 토글)
    const note = document.createElement('button');
    note.className = 'kp-btn kp-note';
    note.id = 'kp-note';
    note.textContent = '메모';
    note.addEventListener('click', () => {
      this.onNoteToggle();
      this._flash(note);
    });
    actions.appendChild(note);
    this._noteBtn = note;

    // 지우기 버튼 (선택 칸 내용 삭제)
    const erase = document.createElement('button');
    erase.className = 'kp-btn kp-erase';
    erase.id = 'kp-erase';
    erase.textContent = '지우기';
    erase.addEventListener('click', () => {
      this.onInput(null);
      this._flash(erase);
    });
    actions.appendChild(erase);

    this.container.appendChild(actions);
  }

  _flash(btn) {
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 130);
  }

  /** 현재 선택 칸의 값과 같은 번호 버튼 강조 */
  highlightValue(value) {
    this.container.querySelectorAll('.kp-num').forEach(btn => {
      btn.classList.toggle('active', Number(btn.textContent) === value);
    });
  }

  /** 메모 모드 여부에 따라 메모 버튼 색상 갱신 */
  setNoteMode(active) {
    this._noteBtn.classList.toggle('active', active);
  }
}
