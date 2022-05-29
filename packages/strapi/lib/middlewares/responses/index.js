const _ = require("lodash")

module.exports = (strapi) => ({
  initialize() {
    strapi.app.use(async (ctx, next) => {
      await next()

      const responseFn = strapi.config.get([
        "functions",
        "responses",
        ctx.status,
      ])
      if (_.isFunction(responseFn)) {
        await responseFn(ctx)
      }
    })
  },
})
