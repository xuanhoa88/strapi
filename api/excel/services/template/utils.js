const fs = require("fs")
const { Workbook } = require("exceljs")
const TemplateEngine = require("./template-engine")
const WorkSheetHelper = require("./worksheet-helper")

function xlsxBuildByTemplate(data, templateFileName, pipes = {}) {
  if (!fs.existsSync(templateFileName)) {
    return Promise.reject(`File ${templateFileName} does not exist`)
  }
  if (typeof data !== "object") {
    return Promise.reject("The data must be an object")
  }
  const workbook = new Workbook()
  return workbook.xlsx.readFile(templateFileName).then(() => {
    workbook.worksheets.forEach((worksheet) => {
      const wsh = new WorkSheetHelper(worksheet)
      const templateEngine = new TemplateEngine(wsh, data, pipes)
      templateEngine.execute()
    })
    return workbook.xlsx.writeBuffer()
  })
}

module.exports.xlsxBuildByTemplate = xlsxBuildByTemplate
