/**
 * Module dependencies
 */

// Public node modules.
const _ = require("lodash")
const Router = require("koa-router")
const createEndpointComposer = require("./utils/composeEndpoint")

/**
 * Router hook
 */

module.exports = (strapi) => {
  const composeEndpoint = createEndpointComposer(strapi)

  return {
    /**
     * Initialize the hook
     */

    initialize() {
      _.forEach(strapi.config.routes, (value) => {
        composeEndpoint(value, { router: strapi.router })
      })

      strapi.router.prefix(
        strapi.config.get("middleware.settings.router.prefix", "")
      )

      if (strapi.plugins) {
        // Parse each plugin's routes.
        _.forEach(strapi.plugins, (plugin, pluginName) => {
          const router = new Router({
            prefix: `/${pluginName}`,
          })

          ;(plugin.config.routes || []).forEach((route) => {
            const hasPrefix = _.has(route.config, "prefix")
            composeEndpoint(route, {
              plugin: pluginName,
              router: hasPrefix ? strapi.router : router,
            })
          })

          // Mount plugin router
          strapi.app.use(router.routes()).use(router.allowedMethods())
        })
      }
    },
  }
}
