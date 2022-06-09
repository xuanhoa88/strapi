/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs')
const path = require('path')

/**
 * Generate a core API
 */

module.exports = {
  templatesDirectory: () => {
    // Try to reach the path. If it fail, throw an error.
    fs.accessSync(
      path.resolve(__dirname, '..', 'templates'),
      // eslint-disable-next-line no-bitwise
      fs.constants.R_OK | fs.constants.W_OK
    )

    return path.resolve(__dirname, '..', 'templates')
  },
  before: require('./before'),
  targets: {
    'helpers/:filename': {
      template: 'helper.template',
    },
  },
}
