class CellRange {
  constructor(top, left, bottom, right) {
    this.top = top
    this.left = left
    this.bottom = bottom
    this.right = right
  }

  static createFromCells(cellTL, cellBR) {
    return new this(+cellTL.row, +cellTL.col, +cellBR.row, +cellBR.col)
  }

  /** Just for clone */
  static createFromRange(range) {
    return new this(range.top, range.left, range.bottom, range.right)
  }

  get valid() {
    return (
      this.top > 0 &&
      this.top <= this.bottom &&
      this.left >= 0 &&
      this.left <= this.right
    )
  }

  get countRows() {
    return this.bottom - this.top + 1
  }

  get countColumns() {
    return this.right - this.left + 1
  }

  move(dRow, dCol) {
    this.top += dRow
    this.bottom += dRow
    this.left += dCol
    this.right += dCol
  }
}

module.exports = CellRange
