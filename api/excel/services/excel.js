/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */
const fs = require('fs')
const path = require('path')
const uuid = require('uuid')

const { xlsxBuildByTemplate } = require('./template/utils')

module.exports = {
  async createFromTemplate({ fileName: templateFileName, payload }) {
    try {
      if (templateFileName && !fs.existsSync(templateFileName)) {
        templateFileName = path.join(
          strapi.config.app.storage,
          'templates',
          'xlsx',
          templateFileName
        )
      }

      const buffer = await xlsxBuildByTemplate({
        payload,
        path: templateFileName,
      })
      const outputFile = path.join(uuid.v4(), path.basename(templateFileName))
      const downloadFilePath = path.join(
        strapi.config.app.storage,
        'download',
        outputFile
      )

      const outputDir = path.dirname(downloadFilePath)
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }
      fs.writeFileSync(downloadFilePath, buffer)

      return { fileName: outputFile }
    } catch (err) {
      if (err.inner) {
        const allErrors = err.inner.reduce(
          (errors, currentValidation) =>
            Object.assign(errors, {
              [currentValidation.path]: currentValidation.errors[0], // first error is enough for this demo
            }),
          {}
        )
        console.log('form error:', allErrors)
        throw allErrors
      }

      console.log('xlsxHelper error:', err)
      strapi.log.error(err)
    }

    return null
  },

  async downloadFile(fileName) {
    try {
      await strapi.validator.validateEntity(
        (Joi) =>
          Joi.object({
            fileName: Joi.string().required(),
          }),
        {
          fileName,
        }
      )

      const downloadFilePath = path.join(
        strapi.config.app.storage,
        'download',
        fileName
      )
      if (!fs.existsSync(downloadFilePath)) {
        throw new Error('File have been deleted.')
      }

      return {
        stream: fs.createReadStream(downloadFilePath),
        displayName: path.basename(fileName),
      }
    } catch (err) {
      strapi.log.error(err)
      throw err
    }
  },
}
