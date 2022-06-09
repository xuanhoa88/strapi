const loadFiles = require('../utils/load/load-files')

module.exports = async ({ dir }) => loadFiles(dir, 'helpers/**/*.js')
