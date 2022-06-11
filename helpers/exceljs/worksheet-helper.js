const _ = require('lodash')
const { ValueType } = require('exceljs')
const CellRange = require('./cell-range')

class WorkSheetHelper {
  constructor(worksheet) {
    this.worksheet = worksheet
  }

  get workbook() {
    return this.worksheet.workbook
  }

  get sheetName() {
    return this.worksheet.name
  }

  addImage(fileName, cell) {
    const imgId = this.workbook.addImage({
      filename: fileName,
      extension: 'jpeg',
    })
    const cellRange = this.getMergeRange(cell)
    if (cellRange) {
      this.worksheet.addImage(imgId, {
        tl: { col: cellRange.left - 0.99999, row: cellRange.top - 0.99999 },
        br: { col: cellRange.right, row: cellRange.bottom },
      })
    } else {
      this.worksheet.addImage(imgId, {
        tl: { col: +cell.col - 0.99999, row: +cell.row - 0.99999 },
        br: { col: +cell.col, row: +cell.row },
      })
    }
  }

  cloneRows(srcRowStart, srcRowEnd, countClones = 1) {
    const countRows = srcRowEnd - srcRowStart + 1
    const dxRow = countRows * countClones
    const lastRow = this.getSheetDimension().bottom + dxRow
    // Move rows below
    for (let rowSrcNumber = lastRow; rowSrcNumber > srcRowEnd; rowSrcNumber--) {
      const rowSrc = this.worksheet.getRow(rowSrcNumber)
      const rowDest = this.worksheet.getRow(rowSrcNumber + dxRow)
      this.moveRow(rowSrc, rowDest)
    }
    // Clone target rows
    for (
      let rowSrcNumber = srcRowEnd;
      rowSrcNumber >= srcRowStart;
      rowSrcNumber--
    ) {
      const rowSrc = this.worksheet.getRow(rowSrcNumber)
      for (let cloneNumber = countClones; cloneNumber > 0; cloneNumber--) {
        const rowDest = this.worksheet.getRow(
          rowSrcNumber + countRows * cloneNumber
        )
        this.copyRow(rowSrc, rowDest)
      }
    }
  }

  copyCellRange(rangeSrc, rangeDest) {
    if (
      rangeSrc.countRows !== rangeDest.countRows ||
      rangeSrc.countColumns !== rangeDest.countColumns
    ) {
      console.warn(
        'WorkSheetHelper.copyCellRange',
        'The cell ranges must have an equal size',
        rangeSrc,
        rangeDest
      )
      return
    }
    // todo: check intersection in the CellRange class
    const dRow = rangeDest.bottom - rangeSrc.bottom
    const dCol = rangeDest.right - rangeSrc.right
    this.eachCellReverse(rangeSrc, (cellSrc) => {
      const cellDest = this.worksheet.getCell(
        cellSrc.row + dRow,
        cellSrc.col + dCol
      )
      this.copyCell(cellSrc, cellDest)
    })
  }

  getSheetDimension() {
    const dm = this.worksheet.dimensions.model
    return new CellRange(dm.top, dm.left, dm.bottom, dm.right)
  }

  /** Iterate cells from the left of the top to the right of the bottom */
  eachCell(cellRange, callBack) {
    for (let r = cellRange.top; r <= cellRange.bottom; r++) {
      const row = this.worksheet.findRow(r)
      if (row) {
        for (let c = cellRange.left; c <= cellRange.right; c++) {
          const cell = row.findCell(c)
          if (cell && cell.type !== ValueType.Merge) {
            if (callBack(cell) === false) {
              return
            }
          }
        }
      }
    }
  }

  /** Iterate cells from the right of the bottom to the top of the left */
  eachCellReverse(cellRange, callBack) {
    for (let r = cellRange.bottom; r >= cellRange.top; r--) {
      const row = this.worksheet.findRow(r)
      if (row) {
        for (let c = cellRange.right; c >= cellRange.left; c--) {
          const cell = row.findCell(c)
          if (cell && cell.type !== ValueType.Merge) {
            if (callBack(cell) === false) {
              return
            }
          }
        }
      }
    }
  }

  getMergeRange(cell) {
    if (cell.isMerged && Array.isArray(this.worksheet.model.merges)) {
      const address =
        cell.type === ValueType.Merge ? cell.master.address : cell.address
      const cellRangeStr = this.worksheet.model.merges.find(
        (item) => item.indexOf(`${address}:`) !== -1
      )
      if (cellRangeStr) {
        const [cellTlAdr, cellBrAdr] = cellRangeStr.split(':', 2)
        return CellRange.createFromCells(
          this.worksheet.getCell(cellTlAdr),
          this.worksheet.getCell(cellBrAdr)
        )
      }
    }
    return null
  }

  moveRow(rowSrc, rowDest) {
    this.copyRow(rowSrc, rowDest)
    this.clearRow(rowSrc)
  }

  copyRow(rowSrc, rowDest) {
    /** @var {RowModel} */
    if (rowSrc.model) {
      const rowModel = _.cloneDeep(rowSrc.model)
      rowModel.number = rowDest.number
      rowModel.cells = []
      rowDest.model = rowModel
      for (
        let colNumber = this.getSheetDimension().right;
        colNumber > 0;
        colNumber--
      ) {
        const cellSrc = rowSrc.getCell(colNumber)
        const newCell = rowDest.getCell(colNumber)
        this.copyCell(cellSrc, newCell)
      }
    }
  }

  copyCell(cellSrc, cellDest) {
    // skip submerged cells
    if (cellSrc.isMerged && cellSrc.type === ValueType.Merge) {
      return
    }

    // Copy cell styles
    cellDest.style = _.cloneDeep(cellSrc.style)

    /** @var {CellModel} */
    const storeCellModel = _.cloneDeep(cellSrc.model)
    storeCellModel.address = cellDest.address

    // Move a merge range
    const cellRange = this.getMergeRange(cellSrc)
    if (cellRange) {
      cellRange.move(+cellDest.row - +cellSrc.row, +cellDest.col - +cellSrc.col)
      this.worksheet.unMergeCells(
        cellRange.top,
        cellRange.left,
        cellRange.bottom,
        cellRange.right
      )
      this.worksheet.mergeCells(
        cellRange.top,
        cellRange.left,
        cellRange.bottom,
        cellRange.right
      )
    }

    // Move an image
    this.worksheet.getImages().forEach((image) => {
      const rng = image.range
      if (
        rng.tl.row <= +cellSrc.row &&
        rng.br.row >= +cellSrc.row &&
        rng.tl.col <= +cellSrc.col &&
        rng.br.col >= +cellSrc.col
      ) {
        rng.tl.row += +cellDest.row - +cellSrc.row
        rng.br.row += +cellDest.row - +cellSrc.row
      }
    })

    cellDest.model = storeCellModel

    // recalculate formulas after duplicate rows
    if (cellDest.type === ValueType.Formula) {
      cellDest.model.result = undefined
    }
  }

  clearRow(row) {
    row.model = {
      cells: [],
      number: row.number,
      min: undefined,
      max: undefined,
      height: undefined,
      style: undefined,
      hidden: undefined,
      outlineLevel: undefined,
      collapsed: undefined,
    }
  }
}

module.exports = WorkSheetHelper
