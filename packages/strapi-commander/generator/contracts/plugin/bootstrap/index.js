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
    'plugins/:name/.gitignore': {
      copy: 'gitignore',
    },

    // Use the default `controller` file as a template for
    // every generated controller.
    'plugins/:name/controllers/:filename': {
      template: 'controller.stub',
    },

    // every generated controller.
    'plugins/:name/services/:filename': {
      template: 'service.stub',
    },

    // Generate routes.
    'plugins/:name/config/routes.json': {
      jsonfile: routesJSON,
    },

    // Copy dot files.
    'plugins/:name/.editorconfig': {
      copy: 'editorconfig',
    },

    'plugins/:name/.gitattributes': {
      copy: 'gitattributes',
    },

    // Copy Markdown files with some information.
    'plugins/:name/README.md': {
      template: 'README.md',
    },
  },
}
