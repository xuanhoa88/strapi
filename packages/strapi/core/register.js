const _ = require('lodash')
const { getAbsoluteServerUrl } = require('@strapi/utils')
const contentTypesUtils = require('../utils/content-types')

module.exports = (strapi) => {
  // Set connections.
  strapi.connections = {}

  // Set current connections.
  strapi.config.connections = strapi.config.get('database.connections', {})

  _.forEach(strapi.api, (api, apiName) => {
    _.forEach(api.controllers, (controller, key) => {
      Object.assign(controller, {
        uid: `api::${controller.uid || key}`,
      })
    })

    _.forEach(api.models, (model, key) => {
      // mutate model
      contentTypesUtils.createContentType(model, key, apiName)
    })
  })

  _.forEach(strapi.plugins, (plugin, pluginName) => {
    _.forEach(plugin.controllers, (controller, key) => {
      Object.assign(controller, {
        uid: `plugin::${controller.uid || key}`,
      })
    })

    _.forEach(plugin.models, (model, key) => {
      // mutate model
      contentTypesUtils.createContentType(model, key, pluginName, true)
    })
  })

  // Preset config in alphabetical order.
  strapi.config.middleware.settings = _.keys(strapi.middlewares).reduce(
    (acc, current) => {
      // Try to find the settings in the current environment, then in the main configurations.
      const currentSettings = _.merge(
        _.cloneDeep(
          _.get(strapi.middlewares[current], ['defaults', current], {})
        ),
        strapi.config.get(['middleware', 'settings', current], {})
      )

      acc[current] = !_.isObject(currentSettings) ? {} : currentSettings

      // Ensure that enabled key exist by forcing to false.
      _.defaults(acc[current], { enabled: false })

      return acc
    },
    {}
  )

  strapi.config.hook.settings = _.keys(strapi.hooks).reduce((acc, current) => {
    // Try to find the settings in the current environment, then in the main configurations.
    const currentSettings = _.merge(
      _.cloneDeep(_.get(strapi.hooks[current], ['defaults', current], {})),
      strapi.config.get(['hook', 'settings', current], {})
    )

    acc[current] = !_.isObject(currentSettings) ? {} : currentSettings

    // Ensure that enabled key exist by forcing to false.
    _.defaults(acc[current], { enabled: false })

    return acc
  }, {})

  // default settings
  strapi.config.port = strapi.config.get('server.port') || strapi.config.port
  strapi.config.host = strapi.config.get('server.host') || strapi.config.host

  const { serverUrl } = getAbsoluteServerUrl(strapi.config)

  strapi.config.server = strapi.config.server || {}
  strapi.config.server.url = serverUrl
}
