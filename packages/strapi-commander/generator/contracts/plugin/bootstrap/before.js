/**
 * Module dependencies
 */

// Public node modules.
const path = require('path')
const fs = require('fs')
const _ = require('lodash')
const pluralize = require('pluralize')
const { nameToSlug } = require('@strapi/utils')

/**
 * This `before` function is run before generating targets.
 * Validate, configure defaults, get extra dependencies, etc.
 *
 * @param {Object} scope
 * @param {Function} cb
 */

module.exports = (scope, cb) => {
  if (!scope.rootPath || !scope.id) {
    return cb.invalid('Usage: `$ strapi generate:plugin pluginName`')
  }

  // Format `id`.
  const name = scope.name || nameToSlug(scope.id)

  // Plugin info.
  _.defaults(scope, {
    name,
    year: new Date().getFullYear(),
    license: 'MIT',
  })

  // Take another pass to take advantage of the defaults absorbed in previous passes.
  _.defaults(scope, {
    route: _.kebabCase(pluralize(name)),
    filename: `${name}.js`,
    filePath: './plugins',
  })

  const pluginDir = path.resolve(scope.rootPath, 'plugins')
  if (!fs.existsSync(pluginDir)) {
    fs.mkdirSync(pluginDir)
  }

  // Trigger callback with no error to proceed.
  return cb.success()
}
