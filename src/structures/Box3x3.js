import { Structure } from '../core/Structure.js';

export class Box3x3 extends Structure {
  constructor(originRow, originCol) {
    const coords = [];
    for (let r = originRow; r < originRow + 3; r++)
      for (let c = originCol; c < originCol + 3; c++)
        coords.push({ row: r, col: c });
    super('box3x3', coords);
    this.originRow = originRow;
    this.originCol = originCol;
  }
}
