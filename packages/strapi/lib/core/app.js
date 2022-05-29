const _ = require("lodash")
const { getAbsoluteServerUrl } = require("@strapi/utils")
const { contentTypes: contentTypesUtils } = require("../utils/content-types")

module.exports = (strapi) => {
  // Set connections.
  strapi.connections = {}

  const defaultConnection = strapi.config.get("database.defaultConnection")

  // Set current connections.
  strapi.config.connections = strapi.config.get("database.connections", {})

  strapi.contentTypes = {}

  // Set models.
  strapi.models = _.keys(strapi.api || []).reduce((acc, key) => {
    for (const index in strapi.api[key].models) {
      const controller = strapi.api[key].models[index]
      controller.identity = controller.identity || _.upperFirst(index)
      acc[index] = controller
    }

    return acc
  }, {})

  // Set controllers.
  strapi.controllers = _.keys(strapi.api || []).reduce((acc, key) => {
    for (const index in strapi.api[key].controllers) {
      const controller = strapi.api[key].controllers[index]
      controller.identity = controller.identity || _.upperFirst(index)
      acc[index] = controller
    }

    return acc
  }, {})

  // Set services.
  strapi.services = _.keys(strapi.api || []).reduce((acc, key) => {
    for (const index in strapi.api[key].services) {
      acc[index] = strapi.api[key].services[index]
    }

    return acc
  }, {})

  // Set routes.
  strapi.config.routes = _.keys(strapi.api || []).reduce(
    (acc, key) => acc.concat(_.get(strapi.api[key], "config.routes") || {}),
    []
  )

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
        identity: controller.identity || key,
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
  strapi.config.middleware.settings = _.keys(strapi.middleware).reduce(
    (acc, current) => {
      // Try to find the settings in the current environment, then in the main configurations.
      const currentSettings = _.merge(
        _.cloneDeep(
          _.get(strapi.middleware[current], ["defaults", current], {})
        ),
        strapi.config.get(["middleware", "settings", current], {})
      )

      acc[current] = !_.isObject(currentSettings) ? {} : currentSettings

      // Ensure that enabled key exist by forcing to false.
      _.defaults(acc[current], { enabled: false })

      return acc
    },
    {}
  )

  strapi.config.hook.settings = _.keys(strapi.hook).reduce((acc, current) => {
    // Try to find the settings in the current environment, then in the main configurations.
    const currentSettings = _.merge(
      _.cloneDeep(_.get(strapi.hook[current], ["defaults", current], {})),
      strapi.config.get(["hook", "settings", current], {})
    )

    acc[current] = !_.isObject(currentSettings) ? {} : currentSettings

    // Ensure that enabled key exist by forcing to false.
    _.defaults(acc[current], { enabled: false })

    return acc
  }, {})

  // default settings
  strapi.config.port = strapi.config.get("server.port") || strapi.config.port
  strapi.config.host = strapi.config.get("server.host") || strapi.config.host

  const { serverUrl } = getAbsoluteServerUrl(strapi.config)

  strapi.config.server = strapi.config.server || {}
  strapi.config.server.url = serverUrl
}
