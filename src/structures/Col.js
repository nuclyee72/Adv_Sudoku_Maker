import { Structure } from '../core/Structure.js';

export class Col extends Structure {
  constructor(colIndex, startRow, length = 9) {
    const coords = Array.from({ length }, (_, i) => ({ row: startRow + i, col: colIndex }));
    super('col', coords);
  }
}
