/**
 * Module dependencies
 */

// Public node modules.
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
    return cb.invalid('Usage: `$ strapi generate:api apiName`')
  }

  // Format `id`.
  const name = scope.name || nameToSlug(scope.id)

  // `scope.args` are the raw command line arguments.
  _.defaults(scope, {
    name,
    route: _.kebabCase(pluralize(scope.id)),
  })

  const filePath = `./api/${name}`

  // Take another pass to take advantage of the defaults absorbed in previous passes.
  _.defaults(scope, {
    filename: `${name}.js`,
    filePath,
  })

  // Set collectionName
  scope.collectionName = _.has(scope.args, 'collectionName')
    ? scope.args.collectionName
    : _.snakeCase(pluralize(name))

  // Set connection
  scope.connection = _.get(scope.args, 'connection', undefined)

  // Trigger callback with no error to proceed.
  return cb.success()
}
