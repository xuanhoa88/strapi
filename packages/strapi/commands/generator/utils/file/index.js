/**
 * Module dependencies
 */

// Node.js core.
const path = require('path')

// Public node modules.
const _ = require('lodash')
const async = require('async')
const fs = require('fs')
const reportback = require('reportback')()

/**
 * Generate a file using the specified string
 */

/* eslint-disable prefer-template */
module.exports = (options, next) => {
  // Provide default values for switchback.
  next = reportback.extend(next, {
    alreadyExists: 'error',
  })

  // Provide defaults and validate required options.
  _.defaults(options, {
    force: false,
  })

  const missingOpts = _.difference(['contents', 'rootPath'], _.keys(options))
  if (missingOpts.length > 0) {
    return next.invalid(missingOpts)
  }

  // In case we ended up here with a relative path,
  // resolve it using the process's CWD
  const rootPath = path.resolve(process.cwd(), options.rootPath)

  // Only override an existing file if `options.force` is true.
  fs.exists(rootPath, (exists) => {
    if (exists && !options.force) {
      return next.alreadyExists(
        'Something else already exists at `' + rootPath + '`.'
      )
    }

    // Don't actually write the file if this is a dry run.
    if (options.dry) {
      return next.success()
    }

    async.series(
      [
        function deleteExistingFileIfNecessary(cb) {
          if (!exists) {
            return cb()
          }
          return fs.remove(rootPath, cb)
        },
        function writeToDisk(cb) {
          const dir = path.dirname(rootPath)
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
          }

          fs.writeFile(rootPath, options.contents, cb)
        },
      ],
      next
    )
  })
}
