const fs = require('fs')
const { Workbook } = require('exceljs')
const TemplateEngine = require('./template-engine')
const WorkSheetHelper = require('./worksheet-helper')

async function xlsxBuildByTemplate({ payload, path }, pipes = {}) {
  await strapi.validator.validateEntity((Joi) =>
    Joi.object({
      path: Joi.string()
        .required()
        .custom((value, helper) =>
          !fs.existsSync(value) ? helper.error('any.invalid') : value
        ),
      payload: Joi.array()
        .items(
          Joi.object({
            sheet: Joi.alternatives()
              .try(Joi.string(), Joi.number())
              .required(),
            values: Joi.object().required(),
          })
        )
        .required(),
    })
  )

  const workbook = new Workbook()
  return workbook.xlsx.readFile(path).then(() => {
    payload.forEach((data) => {
      const worksheet = workbook.getWorksheet(data.sheet)
      const wsh = new WorkSheetHelper(worksheet)
      const templateEngine = new TemplateEngine(wsh, data.values, pipes)
      templateEngine.execute()
    })
    return workbook.xlsx.writeBuffer()
  })
}

module.exports.xlsxBuildByTemplate = xlsxBuildByTemplate
