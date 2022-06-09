/**
 * Module dependencies
 */
const convert = require('koa-convert')
const { p3p } = require('koa-lusca')
/**
 * P3P hook
 */

module.exports = (strapi) => ({
  /**
   * Initialize the hook
   */

  initialize() {
    strapi.app.use(async (ctx, next) =>
      convert(p3p(strapi.config.middlewares.settings.p3p))(ctx, next)
    )
  },
})
