const _ = require('lodash')
const { getAbsoluteServerUrl } = require('@strapi/utils')
const contentTypesUtils = require('../utils/content-types')

module.exports = (strapi) => {
  // Set connections.
  strapi.connections = {}

  const defaultConnection = strapi.config.get('database.defaultConnection')

  // Set current connections.
  strapi.config.connections = strapi.config.get('database.connections', {})

  strapi.contentTypes = {}

  _.keys(strapi.api).forEach((apiName) => {
    const api = strapi.api[apiName]
    Object.assign(api, {
      controllers: api.controllers || [],
      services: api.services || [],
      models: api.models || [],
    })

    _.keys(api.controllers).forEach((key) => {
      const controller = api.controllers[key]

      Object.assign(controller, {
        uid: `api::${controller.uid || key}`,
      })
    })

    _.keys(api.models || []).forEach((modelName) => {
      const model = api.models[modelName]

      // mutate model
      contentTypesUtils.createContentType(
        model,
        { modelName, defaultConnection },
        { apiName }
      )

      strapi.contentTypes[model.uid] = model
    })
  })

  _.keys(strapi.plugins).forEach((pluginName) => {
    const plugin = strapi.plugins[pluginName]
    Object.assign(plugin, {
      controllers: plugin.controllers || [],
      services: plugin.services || [],
      models: plugin.models || [],
    })

    _.keys(plugin.controllers).forEach((key) => {
      const controller = plugin.controllers[key]

      Object.assign(controller, {
        uid: `plugin::${controller.uid || key}`,
      })
    })

    _.keys(plugin.models || []).forEach((modelName) => {
      const model = plugin.models[modelName]

      // mutate model
      contentTypesUtils.createContentType(
        model,
        { modelName, defaultConnection },
        { pluginName }
      )

      strapi.contentTypes[model.uid] = model
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
