/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */
const fs = require("fs")
const path = require("path")
const yup = require("yup")
const uuid = require("uuid")

const { xlsxBuildByTemplate } = require("./template/utils")

module.exports = {
  async createFromTemplate({ fileName: templateFileName, values }) {
    try {
      const schema = yup.object().shape({
        fileName: yup.string().required(),
        values: yup.object().required(),
      })

      await schema.validate(
        {
          fileName: templateFileName,
          values,
        },
        { abortEarly: false }
      )

      if (!fs.existsSync(templateFileName)) {
        templateFileName = path.join(
          strapi.dir,
          "storage",
          "templates",
          "xlsx",
          templateFileName
        )
      }

      const buffer = await xlsxBuildByTemplate(values, templateFileName)
      const outputFile = path.join(uuid.v4(), path.basename(templateFileName))
      const downloadFilePath = path.join(
        strapi.dir,
        "storage",
        "download",
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
        console.log("form error:", allErrors)
        throw allErrors
      }

      console.log("xlsxHelper error:", err)
      strapi.log.error(err)
    }

    return null
  },

  async downloadFile(fileName) {
    try {
      const schema = yup.object().shape({
        fileName: yup.string().required(),
      })

      await schema.validate(
        {
          fileName,
        },
        { abortEarly: false }
      )

      const downloadFilePath = path.join(
        strapi.dir,
        "storage",
        "download",
        fileName
      )
      if (!fs.existsSync(downloadFilePath)) {
        throw new Error("File have been deleted.")
      }

      return {
        stream: fs.createReadStream(downloadFilePath),
        displayName: path.basename(fileName),
      }
    } catch (err) {
      if (err.inner) {
        const allErrors = err.inner.reduce(
          (errors, currentValidation) =>
            Object.assign(errors, {
              [currentValidation.path]: currentValidation.errors[0], // first error is enough for this demo
            }),
          {}
        )
        console.log("form error:", allErrors)
        throw allErrors
      }

      strapi.log.error(err)
    }

    return null
  },
}
