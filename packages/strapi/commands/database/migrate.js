/**
 * Module dependencies
 */

// Public node modules.
const reportback = require('reportback')()
const _ = require('lodash')

// Logger.
const { createLogger } = require('@strapi/logger')
const loadConfiguration = require('../../core/load-configuration')

// Local dependencies.
const generate = require('./generate')
const generateTarget = require('./target')

/* eslint-disable prefer-template */
/**
 * Generate module(s)
 *
 * @param {Object} scope
 * @param {Function} cb
 *
 * @return {[Type]}
 */

module.exports = (scope, cb) => {
  const rootPath = process.cwd()
  const config = loadConfiguration(rootPath)
  const logger = createLogger(config.logger, {})

  cb = cb || {}
  cb = reportback.extend(cb, {
    error: cb.error,
    success: _.noop,
    alreadyExists: () => cb.error(),
  })

  // Use configured module name for this `generatorType` if applicable.
  const { generatorType } = scope
  let generator

  function throwIfModuleNotFoundError(error, m) {
    const isModuleNotFoundError =
      error &&
      error.code === 'MODULE_NOT_FOUND' &&
      error.message.match(new RegExp(m))
    if (!isModuleNotFoundError) {
      logger.error('Invalid `' + generatorType + '` generator.')
      throw error
    }
    return error
  }

  // Try to require the module or throw if error.
  try {
    generator = require('./contracts/' + generatorType + '/bootstrap')
  } catch (error) {
    throwIfModuleNotFoundError(error, generatorType)
  }

  if (!generator) {
    return logger.error(
      'No generator called `' + scope.generatorType + '` found.'
    )
  }

  generate(generator, scope, cb)
}

module.exports.generateTarget = generateTarget
