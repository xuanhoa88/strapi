/**
 * Module dependencies
 */
const convert = require('koa-convert')
const { hsts } = require('koa-lusca')

/**
 * HSTS hook
 */

module.exports = (strapi) => ({
  /**
   * Initialize the hook
   */

  initialize() {
    strapi.app.use(async (ctx, next) =>
      convert(hsts(strapi.config.middleware.settings.hsts))(ctx, next)
    )
  },
})
