const fs = require('fs')
const { Workbook } = require('exceljs')
const Joi = require('joi')
const TemplateEngine = require('./template-engine')
const WorkSheetHelper = require('./worksheet-helper')

const buildUsefulErrorObject = (errors) => {
  const usefulErrors = {}
  errors.forEach((error) => {
    const field = error.path.join('_') || 'payload'
    const type = `${error.type}`.replace(/^(any.)/gi, '')
    if (!usefulErrors.hasOwnProperty(field)) {
      usefulErrors[field] = {
        type,
        msg: `error.${field}.${type}`,
      }
    }
  })
  return usefulErrors
}

function xlsxBuildByTemplate({ payload, path }, pipes = {}) {
  const schema = Joi.object({
    path: Joi.string()
      .required()
      .custom((value, helper) =>
        !fs.existsSync(value) ? helper.error('any.invalid') : value
      ),
    payload: Joi.array()
      .items(
        Joi.object({
          sheet: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
          values: Joi.object().required(),
        })
      )
      .required(),
  })
  const { error } = schema.validate(
    { path, payload },
    {
      abortEarly: false,
      allowUnknown: true,
    }
  )
  if (error) {
    // eslint-disable-next-line prefer-promise-reject-errors
    return Promise.reject({
      validateErrors: buildUsefulErrorObject(error.details),
    })
  }

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
