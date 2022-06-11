const path = require('path')
const { existsSync } = require('fs')
const _ = require('lodash')
const loadFiles = require('../utils/load/load-files')
const loadConfig = require('../utils/load/load-config-files')

module.exports = async ({ appDir }) => {
  const apiDir = path.join(appDir, 'api')

  if (!existsSync(apiDir)) {
    throw new Error(
      `Missing api folder. Please create one in your app root directory`
    )
  }

  const apis = await loadFiles(apiDir, '*/!(config)/**/*.*(js|json)')
  const apiConfigs = await loadConfig(apiDir, '*/config/**/*.*(js|json)')

  return _.merge(apis, apiConfigs)
}
