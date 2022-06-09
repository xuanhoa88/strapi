const convert = require('koa-convert')
const { csp } = require('koa-lusca')
/**
 * CSP hook
 */

module.exports = (strapi) => ({
  /**
   * Initialize the hook
   */

  initialize() {
    strapi.app.use(async (ctx, next) =>
      convert(csp(strapi.config.middleware.settings.csp))(ctx, next)
    )
  },
})
