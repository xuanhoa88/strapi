const ip = require('koa-ip')
/**
 * IP filter hook
 */

module.exports = (strapi) => ({
  /**
   * Initialize the hook
   */

  initialize() {
    const { whiteList, blackList } = strapi.config.middlewares.settings.ip

    strapi.app.use(
      ip({
        whitelist: whiteList,
        blacklist: blackList,
      })
    )
  },
})
