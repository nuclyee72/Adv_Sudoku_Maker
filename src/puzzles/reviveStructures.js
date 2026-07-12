/**
 * reviveStructures.js — JSON 왕복(네트워크 전송)으로 프로토타입을 잃은
 * 평범한 구조체 데이터를 실제 Structure 서브클래스 인스턴스로 복원한다.
 * 모든 구조체는 type/coords + 소수의 원시 필드만 갖고 있어 데이터 손실 없이
 * 그대로 JSON.stringify할 수 있으므로, 받는 쪽에서 이 함수로만 되살리면 된다.
 */
import { Structure } from '../core/Structure.js';
import { Box3x3 } from '../structures/Box3x3.js';
import { Inequality } from '../structures/Inequality.js';
import { Consecutive } from '../structures/Consecutive.js';
import { Snake } from '../structures/Snake.js';
import { Turntable } from '../structures/Turntable.js';

export function reviveStructures(plainStructures) {
  return plainStructures.map((s) => {
    switch (s.type) {
      case 'inequality': return new Inequality(s.a, s.b, s.greater);
      case 'consecutive': return new Consecutive(s.a, s.b);
      case 'snake': return new Snake(s.coords, s.start);
      case 'turntable': return new Turntable(s.originRow, s.originCol, s.size);
      case 'box3x3': return new Box3x3(s.originRow, s.originCol); // originRow/originCol는 베이스 Structure에 없는 전용 필드
      case 'grid9x9': // StandardSudoku.js가 만드는 렌더링 전용 더미 구조체(클래스 아님) - 같은 모양으로 복원
        return { type: 'grid9x9', coords: [], originRow: s.originRow, originCol: s.originCol, validate: () => [] };
      default: return new Structure(s.type, s.coords); // row/col
    }
  });
}
