/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */
const fs = require('fs')
const path = require('path')
const uuid = require('uuid')

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
      const buffer = await strapi.helpers.exceljs.xlsxBuildByTemplate({
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
      strapi.log.error(err)
      throw err
    }
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
