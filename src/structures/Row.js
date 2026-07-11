import { Structure } from '../core/Structure.js';

export class Row extends Structure {
  constructor(rowIndex, startCol, length = 9) {
    const coords = Array.from({ length }, (_, i) => ({ row: rowIndex, col: startCol + i }));
    super('row', coords);
  }
}
