const path = require('path')
const { existsSync } = require('fs')
const fs = require('fs')
const _ = require('lodash')
const loadConfig = require('../utils/load/load-config-files')
const loadFiles = require('../utils/load/load-files')
const glob = require('../utils/load/glob')
const filePathToPath = require('../utils/load/filepath-to-prop-path')

const OVERWRITABLE_FOLDERS_GLOB = 'models'
// returns a list of path and module to overwrite
const loadOverwrites = async (extensionsDir) => {
  const files = await glob(`*/${OVERWRITABLE_FOLDERS_GLOB}/*.*(js|json)`, {
    cwd: extensionsDir,
  })

  const overwrites = {}
  files.forEach((file) => {
    try {
      const absolutePath = path.resolve(extensionsDir, file)

      // load module
      delete require.cache[absolutePath]
      let mod

      if (path.extname(absolutePath) === '.json') {
        mod = JSON.parse(fs.readFileSync(absolutePath))
      } else {
        mod = require(absolutePath)
      }

      const propPath = filePathToPath(file)
      const strPath = propPath.join('.')

      if (overwrites[strPath]) {
        _.merge(overwrites[strPath], mod)
      } else {
        overwrites[strPath] = mod
      }
    } catch (err) {
      console.log(err)
    }
  })

  return _.keys(overwrites).map((strPath) => ({
    path: strPath.split('.'),
    mod: overwrites[strPath],
  }))
}

/**
 * Loads the extensions folder
 */
module.exports = async ({ appDir }) => {
  const extensionsDir = path.resolve(appDir, 'extensions')

  if (!existsSync(extensionsDir)) {
    throw new Error(
      `Missing extensions folder. Please create one in your app root directory`
    )
  }

  const configs = await loadConfig(extensionsDir, '*/config/**/*.+(js|json)')
  const controllersAndServices = await loadFiles(
    extensionsDir,
    '*/{controllers,services}/*.+(js|json)'
  )

  const overwrites = await loadOverwrites(extensionsDir)

  return {
    overwrites,
    merges: _.merge({}, configs, controllersAndServices),
  }
}
