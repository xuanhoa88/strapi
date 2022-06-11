const path = require('path')
const loadFiles = require('../utils/load/load-files')

module.exports = async ({ appDir }) => {
  const helperDir = path.join(appDir, 'helpers')
  return loadFiles(helperDir, '*.js')
}
