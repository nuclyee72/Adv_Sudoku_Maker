export class Validator {
  static validate(board) {
    for (const cell of board.getVisibleCells()) cell.isConflict = false;
    const conflictSet = new Set();
    for (const structure of board.structures) {
      for (const { row, col } of structure.validate(board)) {
        conflictSet.add(`${row},${col}`);
        const cell = board.getCell(row, col);
        if (cell) cell.isConflict = true;
      }
    }
    return conflictSet;
  }
}
