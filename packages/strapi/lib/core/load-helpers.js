const loadFiles = require('../load/load-files')

module.exports = async ({ dir }) => loadFiles(dir, 'helpers/**/*.js')
