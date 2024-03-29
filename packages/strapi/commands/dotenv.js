/**
 * Module dependencies
 */
const crypto = require('crypto')
const fs = require('fs')
const _ = require('lodash')

// Logger.
const { createLogger } = require('@strapi/logger')
const loadConfiguration = require('../core/load-configuration')

const serialize = require('../utils/dotenv/serialize')

/**
 * `$ strapi generate`
 *
 * Scaffolding for the application in our working directory.
 */

module.exports = (id, { args }) => {
  const rootPath = process.cwd()
  const {
    __dotenv: { parsed, path: dotenvPath },
    logger: loggerConfig,
  } = loadConfiguration(rootPath)
  const logger = createLogger(loggerConfig, {})
  try {
    switch (args[0]) {
      case 'key:generate': {
        _.set(
          parsed,
          'STRAPI_KEY',
          `base64:${crypto.randomBytes(32).toString('base64')}`
        )
        logger.info('Application key set successfully.')
        break
      }
      default:
    }
    fs.writeFileSync(dotenvPath, serialize(parsed), {
      encoding: 'utf8',
    })
  } catch (e) {
    logger.error(e)
    process.exit(1)
  }
}
