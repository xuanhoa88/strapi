const convert = require('koa-convert')
const { xframe } = require('koa-lusca')
const defaults = require('./defaults.json')

/**
 * CRON hook
 */

module.exports = (strapi) => ({
  /**
   * Initialize the hook
   */

  initialize() {
    strapi.app.use(async (ctx, next) => {
      const { enabled, value } = strapi.config.get(
        'middleware.settings.xframe',
        defaults
      )
      if (enabled) {
        return convert(xframe(value))(ctx, next)
      }

      await next()
    })
  },
})
