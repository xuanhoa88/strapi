// Dependencies.
const path = require('path')
const fs = require('fs')
const _ = require('lodash')
const glob = require('../utils/load/glob')
const findPackagePath = require('../utils/load/package-path')
const { isNotJunk } = require('../utils/junk')

const mountHooks = (name, files, hooks) => {
  files.forEach((file) => {
    hooks[name] = hooks[name] || { loaded: false }
    let dependencies = []
    try {
      dependencies = _.get(
        require(`strapi-hook-${name}/package.json`),
        'strapi.dependencies',
        []
      )
    } catch (err) {
      // Silent
    }

    if (_.endsWith(file, 'index.js') && !hooks[name].load) {
      Object.defineProperty(hooks[name], 'load', {
        configurable: false,
        enumerable: true,
        get: () => require(file)(strapi),
      })
      hooks[name].dependencies = dependencies
      return
    }

    if (_.endsWith(file, 'defaults.json')) {
      hooks[name].defaults = require(file)
    }
  })
}

const loadHooksInDir = async (dir, hook) => {
  const files = await glob('*/*(index|defaults).*(js|json)', {
    cwd: dir,
  })
  files.forEach((f) => {
    const name = f.split('/')[0]
    mountHooks(name, [path.resolve(dir, f)], hook)
  })
}

const loadLocalHooks = (appPath, settings) =>
  loadHooksInDir(path.resolve(appPath, 'hooks'), settings)

const loadPluginsHooks = async (plugins, settings) => {
  await Promise.all(
    _.map(plugins, (pluginName) => {
      const dir = path.resolve(
        findPackagePath(`strapi-plugin-${pluginName}`),
        'hooks'
      )
      return loadHooksInDir(dir, settings)
    })
  )
}

const loadLocalPluginsHooks = async (appPath, settings) => {
  const pluginsDir = path.resolve(appPath, 'plugins')
  if (!fs.existsSync(pluginsDir)) return

  const pluginsNames = fs.readdirSync(pluginsDir).filter(isNotJunk)
  await Promise.all(
    _.map(pluginsNames, (pluginName) => {
      // ignore files
      const stat = fs.statSync(path.resolve(pluginsDir, pluginName))
      if (!stat.isDirectory()) return

      const dir = path.resolve(pluginsDir, pluginName, 'hooks')
      return loadHooksInDir(dir, settings)
    })
  )
}

const loadHookDependencies = async (installedHooks, settings) => {
  for (const hook of installedHooks) {
    const hookDir = path.dirname(require.resolve(`strapi-hook-${hook}`))

    // eslint-disable-next-line no-await-in-loop
    const files = await glob('*(index|defaults).*(js|json)', {
      cwd: hookDir,
      absolute: true,
    })

    mountHooks(hook, files, settings)
  }
}

/**
 * Load hooks
 */
module.exports = async ({
  installedHooks,
  installedPlugins,
  appPath,
  hook,
}) => {
  await Promise.all([
    loadHookDependencies(installedHooks, hook),
    // local hooks
    loadLocalHooks(appPath, hook),
    // plugins hooks
    loadPluginsHooks(installedPlugins, hook),
    // local plugin hooks
    loadLocalPluginsHooks(appPath, hook),
  ])

  return hook
}
