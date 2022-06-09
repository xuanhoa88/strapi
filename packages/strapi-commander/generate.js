/**
 * Module dependencies
 */

const _ = require('lodash')

// Logger.
const { createLogger } = require('@strapi/logger')
const loadConfiguration = require('../strapi/core/load-configuration')

// Master of ceremonies for generators.
const generator = require('./generator')

/**
 * `$ strapi generate`
 *
 * Scaffolding for the application in our working directory.
 */

module.exports = (id, cliArguments) => {
  const rootPath = process.cwd()
  const config = loadConfiguration(rootPath)
  const logger = createLogger(config.logger, {})

  // Build initial scope.
  const scope = {
    rootPath,
    id,
    args: cliArguments,
  }

  _.set(scope, 'generatorType', process.argv[2].split(':')[1])

  // Show usage if no generator type is defined.
  if (!scope.generatorType) {
    return logger.error('Write `$ strapi generate:something` instead.')
  }

  return generator(scope, {
    // Log and exit the REPL in case there is an error
    // while we were trying to generate the requested generator.
    error(msg) {
      logger.error(msg)
      process.exit(1)
    },

    // Log and exit the REPL in case of success
    // but first make sure we have all the info we need.
    success() {
      if (!scope.outputPath && scope.filename && scope.destDir) {
        scope.outputPath = scope.destDir + scope.filename
      }

      if (scope.generatorType !== 'new') {
        logger.info(
          `Generated a new ${scope.generatorType} \`${scope.name}\` at \`${scope.filePath}\`.`
        )
      }

      process.exit(0)
    },
  })
}
