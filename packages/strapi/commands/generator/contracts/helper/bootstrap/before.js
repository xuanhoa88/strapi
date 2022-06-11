/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash')

/**
 * This `before` function is run before generating targets.
 * Validate, configure defaults, get extra dependencies, etc.
 *
 * @param {Object} scope
 * @param {Function} cb
 */

/* eslint-disable prefer-template */
module.exports = (scope, cb) => {
  if (!scope.rootPath || !scope.id) {
    return cb.invalid('Usage: `$ strapi generate:helper helperName`')
  }

  // `scope.args` are the raw command line arguments.
  _.defaults(scope, {
    id: _.trim(_.deburr(scope.id)),
  })

  // Determine default values based on the available scope.
  _.defaults(scope, {
    globalID: _.camelCase(scope.id),
    ext: '.js',
  })

  // Take another pass to take advantage of the defaults absorbed in previous passes.
  _.defaults(scope, {
    filePath: `./helpers/${scope.id}`,
    name: scope.globalID,
    rootPath: scope.rootPath,
    filename: scope.globalID + scope.ext,
  })

  // Humanize output.
  _.defaults(scope, {
    humanizeId: _.camelCase(scope.id).toLowerCase(),
    humanizedPath: '`' + scope.filePath + '`',
  })

  // Trigger callback with no error to proceed.
  return cb()
}
