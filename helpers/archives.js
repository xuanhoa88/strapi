/**
 * `archives` helper.
 */
const fs = require('fs')
const path = require('path')
const uuid = require('uuid')
const AdmZip = require('adm-zip')
const _ = require('lodash')

module.exports = {
  extractArchive(zipFile) {
    try {
      if (!fs.existsSync(zipFile)) {
        throw new Error('File may not exist')
      }
      const zip = new AdmZip(zipFile)

      const outputDir = path.join(
        strapi.config.app.storage,
        'unzip',
        uuid.v4(),
        path.basename(zipFile, path.extname(zipFile))
      )
      zip.extractAllTo(outputDir)

      console.log(`Extracted to "${zipFile}" successfully`)

      return outputDir
    } catch (e) {
      console.log(`Something went wrong. ${e}`)
    }
  },

  createZipArchive(zipFile, src) {
    try {
      const zip = new AdmZip()
      if (fs.statSync(src).isDirectory()) {
        zip.addFile(`${_.trimEnd(src, '/')}/`, null)
      } else {
        _.forEach(src, (f) => {
          zip.addFile(f, fs.readFileSync(f))
        })
      }
      zip.writeZip(
        path.join(strapi.config.app.storage, 'zip', uuid.v4(), zipFile)
      )
      console.log(`Created ${zipFile} successfully`)
    } catch (e) {
      console.log(`Something went wrong. ${e}`)
    }
  },

  updateZipArchive(zipFile, src) {
    try {
      if (!fs.existsSync(zipFile)) {
        throw new Error('File may not exist')
      }
      const zip = new AdmZip(zipFile)
      zip.addFile(src, fs.readFileSync(src))
      zip.writeZip(zipFile)
      console.log(`Updated ${zipFile} successfully`)
    } catch (e) {
      console.log(`Something went wrong. ${e}`)
    }
  },

  readZipArchive(zipFile) {
    try {
      if (!fs.existsSync(zipFile)) {
        throw new Error('File may not exist')
      }
      const zip = new AdmZip(zipFile)
      return zip.getEntries()
    } catch (e) {
      console.log(`Something went wrong. ${e}`)
    }
  },
}
