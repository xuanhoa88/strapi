/**
 * X-Response-Time hook
 */

module.exports = (strapi) => ({
  /**
   * Initialize the hook
   */

  initialize() {
    strapi.app.use(async (ctx, next) => {
      const start = Date.now()

      await next()

      const delta = Math.ceil(Date.now() - start)

      ctx.set('X-Response-Time', delta + 'ms') // eslint-disable-line prefer-template
    })
  },
})
