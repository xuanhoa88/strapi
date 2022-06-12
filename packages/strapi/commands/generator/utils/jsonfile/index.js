/**
 * Module dependencies
 */

// Node.js core.
const path = require('path')

// Public node modules.
const _ = require('lodash')
const fs = require('fs')
const reportback = require('reportback')()

/**
 * Generate a JSON file
 */

/* eslint-disable prefer-template */
module.exports = (options, handlers) => {
  // Provide default values for handlers.
  handlers = reportback.extend(handlers, {
    alreadyExists: 'error',
  })

  // Provide defaults and validate required options.
  _.defaults(options, {
    force: false,
  })

  const missingOpts = _.difference(['rootPath', 'data'], _.keys(options))
  if (missingOpts.length > 0) {
    return handlers.invalid(missingOpts)
  }

  const rootPath = path.resolve(process.cwd(), options.rootPath)

  function afterwards() {
    const dir = path.dirname(rootPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFile(
      rootPath,
      JSON.stringify(options.data, null, 2),
      { encoding: 'utf8' },
      (err) => {
        if (err) {
          return handlers.error(err)
        }
        handlers.success()
      }
    )
  }

  // Only override an existing file if `options.force` is true.
  fs.exists(rootPath, (exists) => {
    if (exists && !options.force) {
      return handlers.alreadyExists(
        'Something else already exists at `' + rootPath + '`.'
      )
    }

    if (exists) {
      fs.remove(rootPath, (err) => {
        if (err) {
          return handlers.error(err)
        }
        afterwards()
      })
    } else {
      afterwards()
    }
  })
}
