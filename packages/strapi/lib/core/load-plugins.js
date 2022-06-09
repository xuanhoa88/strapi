const path = require('path')
const fs = require('fs')
const _ = require('lodash')
const findPackagePath = require('../utils/load/package-path')
const loadFiles = require('../utils/load/load-files')
const loadConfig = require('../utils/load/load-config-files')

const loadLocalPlugins = async ({ dir, config }) => {
  const pluginsDir = path.join(dir, 'plugins')
  if (!fs.existsSync(pluginsDir)) return {}

  const [files, configs] = await Promise.all([
    loadFiles(pluginsDir, '{*/!(config)/*.*(js|json),*/package.json}'),
    loadConfig(pluginsDir, '*/config/**/*.+(js|json)'),
  ])

  const userConfigs = _.keys(files).reduce((acc, plugin) => {
    acc[plugin] = { config: config.get(['plugins', plugin], {}) }
    return acc
  }, {})
  return _.merge(files, configs, userConfigs)
}

const loadDependencyPlugins = async (config) => {
  const plugins = {}

  for (const plugin of config.installedPlugins) {
    const pluginPath = findPackagePath(`strapi-plugin-${plugin}`)

    const files = await loadFiles(
      pluginPath,
      '{!(config|node_modules|tests)/*.*(js|json),package.json}'
    )

    const { config: pluginConfig } = await loadConfig(pluginPath)

    const userConfig = config.get(['plugins', plugin], {})

    const mergedConfig = _.merge(pluginConfig, userConfig)

    _.set(plugins, plugin, _.assign({}, files, { config: mergedConfig }))
  }

  return plugins
}

module.exports = async ({ dir, config }) => {
  // internal plugins
  const internalPlugins = await loadLocalPlugins({
    dir: path.resolve(__dirname, '..'),
    config,
  })

  // local plugins
  const localPlugins = await loadLocalPlugins({ dir, config })

  // dependency plugins
  const dependencyPlugins = await loadDependencyPlugins(config)

  const pluginsIntersection = _.intersection(
    _.keys(internalPlugins),
    _.keys(localPlugins),
    _.keys(dependencyPlugins)
  )

  if (pluginsIntersection.length > 0) {
    throw new Error(
      `You have some local plugins with the same name as npm installed plugins:\n${pluginsIntersection
        .map((p) => `- ${p}`)
        .join('\n')}`
    )
  }

  // check for conflicts
  return _.merge(dependencyPlugins, internalPlugins, localPlugins)
}
