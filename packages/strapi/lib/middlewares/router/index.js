/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash')
const Router = require('koa-router')
const createEndpointComposer = require('./utils/composeEndpoint')

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
      // Parse each api's routes.
      _.forEach(strapi.api, (api, apiName) => {
        const router = new Router({
          prefix: `/api/${_.trim(api.config.prefix, '/') || apiName}`,
        })
        _.forEach(api.config.routes, (route) => {
          composeEndpoint(route, {
            router,
            name: apiName,
          })
        })

        // Mount api router
        strapi.router.use(router.routes()).use(router.allowedMethods())
      })

      // Parse each plugin's routes.
      _.forEach(strapi.plugins, (plugin, pluginName) => {
        const router = new Router({
          prefix: `/plugin/${_.trim(plugin.config.prefix, '/') || pluginName}`,
        })

        _.forEach(plugin.config.routes, (route) => {
          composeEndpoint(route, {
            name: pluginName,
            type: 'plugin',
            router,
          })
        })

        // Mount plugin router
        strapi.router.use(router.routes()).use(router.allowedMethods())
      })
    },
  }
}
