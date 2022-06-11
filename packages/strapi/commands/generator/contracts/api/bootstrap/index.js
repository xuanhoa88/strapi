/**
 * Module dependencies
 */

// Node.js core.
const path = require('path')

// Local dependencies.
const routesJSON = require('../json/routes')

/**
 * Generate a core API
 */

module.exports = {
  templatesDirectory: path.resolve(__dirname, '..', 'templates'),
  before: require('./before'),
  targets: {
    // Use the default `controller` file as a template for
    // every generated controller.
    ':filePath/controllers/:filename': {
      template: 'controller.stub',
    },

    // every generated controller.
    ':filePath/services/:filename': {
      template: 'service.stub',
    },

    // Copy an empty JavaScript model where every functions will be.
    ':filePath/models/:filename': {
      template: 'model.stub',
    },

    // Generate routes.
    ':filePath/config/routes.json': {
      jsonfile: routesJSON,
    },
  },
}
