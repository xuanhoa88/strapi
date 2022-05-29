/**
 * Module dependencies
 */
const cors = require("@koa/cors")
const _ = require("lodash")

const defaults = {
  origin: "*",
  maxAge: 31536000,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
  headers: ["Content-Type", "Authorization", "Origin", "Accept"],
  keepHeadersOnError: false,
}

module.exports = (strapi) => ({
  /**
   * Initialize the hook
   */
  initialize() {
    const {
      origin,
      expose,
      maxAge,
      credentials,
      methods,
      headers,
      keepHeadersOnError,
    } = _.assign({}, defaults, strapi.config.get("middleware.settings.cors"))

    strapi.app.use(
      cors({
        keepHeadersOnError,
        maxAge,
        credentials,
        async origin(ctx) {
          let originList
          if (_.isFunction(origin)) {
            originList = await origin(ctx)
          } else {
            originList = origin
          }

          const whitelist = _.isArray(originList)
            ? originList
            : originList.split(/\s*,\s*/)

          const requestOrigin = ctx.accept.headers.origin

          if (_.includes(whitelist, "*")) {
            return requestOrigin
          }

          if (!_.includes(whitelist, requestOrigin)) {
            return ctx.throw(`${requestOrigin} is not a valid origin`)
          }

          return requestOrigin
        },
        exposeHeaders: expose,
        allowMethods: methods,
        allowHeaders: headers,
      })
    )
  },
})
