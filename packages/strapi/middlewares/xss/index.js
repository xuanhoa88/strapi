const convert = require('koa-convert')
const { xssProtection } = require('koa-lusca')

module.exports = (strapi) => ({
  initialize() {
    strapi.app.use(async (ctx, next) => {
      const xssConfig = strapi.config.get('middleware.settings.xss')
      if (xssConfig.enabled) {
        return convert(xssProtection(xssConfig))(ctx, next)
      }

      await next()
    })
  },
})
