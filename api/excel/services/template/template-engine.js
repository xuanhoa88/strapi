const fs = require('fs')
const moment = require('moment')
const TemplateExpression = require('./template-expression')
const CellRange = require('./cell-range')

class TemplateEngine {
  constructor(wsh, data, customPipes) {
    this.wsh = wsh
    this.data = data
    this.customPipes = customPipes

    this.regExpBlocks = /\[\[.+?]]/g
    this.regExpValues = /{{.+?}}/g
    this.regExpStringPipeParameter = /^'.*'$/
  }

  execute() {
    this.processBlocks(this.wsh.getSheetDimension(), this.data)
    this.processValues(this.wsh.getSheetDimension(), this.data)
  }

  processBlocks(cellRange, data) {
    if (!cellRange.valid) {
      console.log(
        'exceljs-template: Process blocks failed.',
        'The cell range is invalid and will be skipped:',
        this.wsh.sheetName,
        cellRange
      )
      return cellRange
    }
    let restart
    do {
      restart = false
      this.wsh.eachCell(cellRange, (cell) => {
        let cVal = cell.value
        if (typeof cVal !== 'string') {
          return null
        }
        const matches = cVal.match(this.regExpBlocks)
        if (!Array.isArray(matches) || !matches.length) {
          return null
        }
        matches.forEach((rawExpression) => {
          const tplExp = new TemplateExpression(
            rawExpression,
            rawExpression.slice(2, -2)
          )
          cVal = cVal.replace(tplExp.rawExpression, '')
          cell.value = cVal
          const resultData = this.processTplValues(tplExp, data)
          cellRange = this.processBlockPipes(
            cellRange,
            cell,
            tplExp.pipes,
            resultData
          )
        })
        restart = true
        return false
      })
    } while (restart)
    return cellRange
  }

  processValues(cellRange, data) {
    if (!cellRange.valid) {
      console.log(
        'exceljs-template: Process values failed.',
        'The cell range is invalid and will be skipped:',
        this.wsh.sheetName,
        cellRange
      )
      return
    }
    this.wsh.eachCell(cellRange, (cell) => {
      let cVal = cell.value
      if (typeof cVal !== 'string') {
        return
      }
      const matches = cVal.match(this.regExpValues)
      if (!Array.isArray(matches) || !matches.length) {
        return
      }
      matches.forEach((rawExpression) => {
        const tplExp = new TemplateExpression(
          rawExpression,
          rawExpression.slice(2, -2)
        )
        const resultData = this.processTplValues(tplExp, data)
        const pipes = this.processTplPipes(tplExp, data)
        let resultValue = this.accountForZero(resultData)
        resultValue = this.processValuePipes(cell, pipes, resultValue)
        cVal = resultValue
      })
      cell.value = cVal
    })
  }

  processTplValues(tplExp, data) {
    let resultData = data[tplExp.valueName]
    if (!resultData) {
      resultData = tplExp.valueName
        .split('.')
        .reduce(
          (o, key) => ((o && o[key]) || o[key] === 0 ? o[key] : null),
          this.data
        )
    }
    return resultData
  }

  processTplPipes(tplExp, data) {
    const pipes = tplExp.pipes.map((p) => {
      p.pipeParameters = p.pipeParameters.map((param) => {
        if (this.regExpStringPipeParameter.test(param)) {
          return param.slice(1, -1)
        }
        if (data[param] || data[param] === 0) {
          return data[param]
        }
        return param
          .split('.')
          .reduce(
            (o, key) => ((o && o[key]) || o[key] === 0 ? o[key] : null),
            this.data
          )
      })
      return p
    })
    return pipes
  }

  accountForZero(input) {
    if (input !== null && input !== undefined) {
      return input
    }
    if (input === 0) {
      return 0
    }
    return null
  }

  processValuePipes(cell, pipes, value) {
    try {
      pipes.forEach((pipe) => {
        if (
          this.customPipes[pipe.pipeName] &&
          typeof this.customPipes[pipe.pipeName] === 'function'
        ) {
          value = this.customPipes[pipe.pipeName](value, ...pipe.pipeParameters)
          return
        }
        switch (pipe.pipeName) {
          case 'date':
            // value = this.valuePipeDate(value, ...pipe.pipeParameters);
            value = this.valuePipeDate(value)
            break
          case 'image':
            // value = this.valuePipeImage(cell, value, ...pipe.pipeParameters);
            value = this.valuePipeImage(cell, value)
            break
          case 'find':
            value = this.valuePipeFind(value, ...pipe.pipeParameters)
            break
          case 'get':
            value = this.valuePipeGet(value, ...pipe.pipeParameters)
            break
          case 'time':
            value = this.valuePipeTime(value)
            break
          case 'datetime':
            value = this.valuePipeDateTime(value)
            break
          case 'number':
            value = this.valuePipeNumber(value)
            break
          default:
            value = `exceljs-template: The value pipe not found:${pipe.pipeName}`
            console.warn(value)
        }
      })
    } catch (error) {
      console.error('exceljs-template: Error on process values of pipes', error)
      return 'exceljs-template: Error on process values of pipes. Look for more details in a console.'
    }
    if (value === 0) {
      return value
    }
    return value || ''
  }

  processBlockPipes(cellRange, cell, pipes, data) {
    const newRange = CellRange.createFromRange(cellRange)
    let insertedRows
    try {
      pipes.forEach((pipe) => {
        switch (pipe.pipeName) {
          case 'repeat-rows':
            insertedRows = this.blockPipeRepeatRows(
              cell,
              data,
              ...pipe.pipeParameters
            )
            newRange.bottom += insertedRows
            break
          case 'tile':
            insertedRows = this.blockPipeTile(
              cell,
              data,
              ...pipe.pipeParameters
            )
            newRange.bottom += insertedRows
            break
          case 'filter':
            data = this.blockPipeFilter(data, ...pipe.pipeParameters)
            break
          default:
            console.warn(
              'exceljs-template: The block pipe not found:',
              pipe.pipeName,
              pipe.pipeParameters
            )
        }
      })
    } catch (error) {
      console.error(
        'exceljs-template: Error on process a block of pipes',
        error
      )
      cell.value =
        'exceljs-template: Error on process a block of pipes. Look for more details in a console.'
    }
    return newRange
  }

  valuePipeNumber(value) {
    if (Number(value) && value % 1 !== 0) {
      return parseFloat(value)
    }
    if (Number(value) && value % 1 === 0) {
      return parseInt(value)
    }
    return value
  }

  valuePipeDate(date) {
    return date ? moment(new Date(date)).format('DD.MM.YYYY') : ''
  }

  valuePipeTime(date) {
    return date ? moment(new Date(date)).format('HH:mm:ss') : ''
  }

  valuePipeDateTime(date) {
    return date ? moment(new Date(date)).format('DD.MM.YYYY HH:mm:ss') : ''
  }

  valuePipeImage(cell, fileName) {
    if (fs.existsSync(fileName)) {
      this.wsh.addImage(fileName, cell)
      return fileName
    }
    return ``
  }

  /** Find object in array by value of a property */
  valuePipeFind(arrayData, propertyName, propertyValue) {
    if (Array.isArray(arrayData) && propertyName && propertyName) {
      return arrayData.find(
        (item) =>
          item &&
          item[propertyName] &&
          item[propertyName].length > 0 &&
          item[propertyName] === propertyValue
      )
    }
    return null
  }

  valuePipeGet(data, propertyName) {
    return (data && propertyName && data[propertyName]) || null
  }

  blockPipeFilter(dataArray, propertyName, propertyValue) {
    if (Array.isArray(dataArray) && propertyName) {
      if (propertyValue) {
        return dataArray.filter(
          (item) =>
            typeof item === 'object' &&
            item[propertyName] &&
            item[propertyName].length > 0 &&
            item[propertyName] === propertyValue
        )
      }
      return dataArray.filter(
        (item) =>
          typeof item === 'object' &&
          item.hasOwnProperty(propertyName) &&
          item[propertyName] &&
          item[propertyName].length > 0
      )
    }
    return dataArray
  }

  /** @return {number} count of inserted rows */
  blockPipeRepeatRows(cell, dataArray, countRows) {
    if (!Array.isArray(dataArray) || !dataArray.length) {
      console.warn(
        'TemplateEngine.blockPipeRepeatRows',
        cell.address,
        'The data must be not empty array, but got:',
        dataArray
      )
      return 0
    }
    countRows = +countRows > 0 ? +countRows : 1
    const startRow = +cell.row
    const endRow = startRow + countRows - 1
    if (dataArray.length > 1) {
      this.wsh.cloneRows(startRow, endRow, dataArray.length - 1)
    }
    const wsDimension = this.wsh.getSheetDimension()
    let sectionRange = new CellRange(
      startRow,
      wsDimension.left,
      endRow,
      wsDimension.right
    )
    dataArray.forEach((data) => {
      sectionRange = this.processBlocks(sectionRange, data)
      this.processValues(sectionRange, data)
      sectionRange.move(+countRows, 0)
    })
    return (dataArray.length - 1) * countRows
  }

  /** @return {number} count of inserted rows */
  blockPipeTile(cell, dataArray, blockRows, blockColumns, tileColumns) {
    // return;
    if (!Array.isArray(dataArray) || !dataArray.length) {
      console.warn(
        'TemplateEngine.blockPipeTile',
        cell.address,
        'The data must be not empty array, but got:',
        dataArray
      )
      return 0
    }
    blockRows = +blockRows > 0 ? +blockRows : 1
    blockColumns = +blockColumns > 0 ? +blockColumns : 1
    tileColumns = +tileColumns > 0 ? +tileColumns : 1
    const blockRange = new CellRange(
      +cell.row,
      +cell.col,
      +cell.row + blockRows - 1,
      +cell.col + blockColumns - 1
    )
    const cloneRowsCount = Math.ceil(dataArray.length / tileColumns) - 1
    if (dataArray.length > tileColumns) {
      this.wsh.cloneRows(blockRange.top, blockRange.bottom, cloneRowsCount)
    }
    let tileColumn = 1
    let tileRange = CellRange.createFromRange(blockRange)
    dataArray.forEach((data, idx, array) => {
      // Prepare the next tile
      if (idx !== array.length - 1 && tileColumn + 1 <= tileColumns) {
        const nextTileRange = CellRange.createFromRange(tileRange)
        nextTileRange.move(0, tileRange.countColumns)
        this.wsh.copyCellRange(tileRange, nextTileRange)
      }
      // Process templates
      tileRange = this.processBlocks(tileRange, data)
      this.processValues(tileRange, data)
      // Move tiles
      if (idx !== array.length - 1) {
        tileColumn++
        if (tileColumn <= tileColumns) {
          tileRange.move(0, tileRange.countColumns)
        } else {
          tileColumn = 1
          blockRange.move(tileRange.countRows, 0)
          tileRange = CellRange.createFromRange(blockRange)
        }
      }
    })
    return cloneRowsCount * blockRange.countRows
  }
}

module.exports = TemplateEngine
