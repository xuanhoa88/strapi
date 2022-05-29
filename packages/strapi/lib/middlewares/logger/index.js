const chalk = require("chalk")
const _ = require("lodash")

const codeToColor = (code) =>
  code >= 500
    ? chalk.red(code)
    : code >= 400
    ? chalk.yellow(code)
    : code >= 300
    ? chalk.cyan(code)
    : code >= 200
    ? chalk.green(code)
    : code

/**
 * Logger hook
 */

module.exports = (strapi) => ({
  /**
   * Initialize the hook
   */
  initialize() {
    const { level, exposeInContext, requests } =
      strapi.config.middleware.settings.logger

    const logLevels = _.keys(strapi.log.levels)

    if (!_.includes(logLevels, level)) {
      throw new Error(
        `Invalid log level set in middleware configuration. Accepted values are: '${logLevels.join(
          "', '"
        )}'.`
      )
    }

    strapi.log.level = level

    if (exposeInContext) {
      strapi.app.context.log = strapi.log
    }

    const isLogLevelEnvVariableSet = _.isString(process.env.STRAPI_LOG_LEVEL)

    if (isLogLevelEnvVariableSet && strapi.log.levelVal <= 20) {
      strapi.log.debug(
        `STRAPI_LOG_LEVEL environment variable is overridden by logger middleware. It only applies outside Strapi's middleware context.`
      )
    }

    if (requests && strapi.log.levelVal <= 20) {
      strapi.app.use(async (ctx, next) => {
        const start = Date.now()
        await next()
        const delta = Math.ceil(Date.now() - start)
        strapi.log.debug(
          `${ctx.method} ${ctx.url} (${delta} ms) ${codeToColor(ctx.status)}`
        )
      })
    }
  },
})
