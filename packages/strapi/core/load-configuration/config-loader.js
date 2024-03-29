const path = require('path')
const fs = require('fs')
const _ = require('lodash')
const { isNotJunk } = require('../../utils/junk')
const env = require('../../utils/dotenv')
const templateConfiguration = require('../../utils/template-configuration')

const loadJsFile = (file) => {
  try {
    const jsModule = require(file)

    // call if function
    if (_.isFunction(jsModule)) {
      return jsModule({ env })
    }

    return jsModule
  } catch (error) {
    throw new Error(`Could not load js config file ${file}: ${error.message}`)
  }
}

const loadJSONFile = (file) => {
  try {
    return templateConfiguration(JSON.parse(fs.readFileSync(file)))
  } catch (error) {
    throw new Error(`Could not load json config file ${file}: ${error.message}`)
  }
}

const loadFile = (file) => {
  const ext = path.extname(file)

  switch (ext) {
    case '.js':
      return loadJsFile(file)
    case '.json':
      return loadJSONFile(file)
    default:
      return {}
  }
}

module.exports = (dir) => {
  if (!fs.existsSync(dir)) return {}

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((file) => file.isFile() && isNotJunk(file.name))
    .reduce((acc, file) => {
      const key = path.basename(file.name, path.extname(file.name))
      acc[key] = loadFile(path.resolve(dir, file.name))
      return acc
    }, {})
}
