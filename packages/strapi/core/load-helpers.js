const loadFiles = require('../utils/load/load-files')

module.exports = async ({ appDir }) => loadFiles(appDir, 'helpers/**/*.js')
