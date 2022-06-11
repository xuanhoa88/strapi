// Dependencies.
const path = require('path')
const fs = require('fs')
const _ = require('lodash')
const glob = require('../utils/load/glob')
const findPackagePath = require('../utils/load/package-path')
const { isNotJunk } = require('../utils/junk')

function mountMiddleware(name, files, middlewares) {
  files.forEach((file) => {
    middlewares[name] = middlewares[name] || { loaded: false }
    if (_.endsWith(file, 'index.js') && !middlewares[name].load) {
      return Object.defineProperty(middlewares[name], 'load', {
        configurable: false,
        enumerable: true,
        get: () => require(file)(strapi),
      })
    }

    if (_.endsWith(file, 'defaults.json')) {
      middlewares[name].defaults = require(file)
    }
  })
}

/**
 * Build loader functions
 * @param {*} strapi - strapi instance
 */
const createLoaders = () => {
  async function loadMiddlewaresInDir(dir, middlewares) {
    const files = await glob('*/*(index|defaults).*(js|json)', {
      cwd: dir,
    })

    files.forEach((f) => {
      const name = f.split('/')[0]
      mountMiddleware(name, [path.resolve(dir, f)], middlewares)
    })
  }

  function loadInternalMiddlewares(middlewares) {
    return loadMiddlewaresInDir(
      path.resolve(__dirname, '..', 'middlewares'),
      middlewares
    )
  }

  function loadLocalMiddlewares(appDir, middlewares) {
    return loadMiddlewaresInDir(
      path.resolve(appDir, 'middlewares'),
      middlewares
    )
  }

  async function loadPluginsMiddlewares(plugins, middlewares) {
    Promise.all(
      _.map(plugins, (pluginName) =>
        loadMiddlewaresInDir(
          path.resolve(
            findPackagePath(`strapi-plugin-${pluginName}`),
            'middlewares'
          ),
          middlewares
        )
      )
    )
  }

  async function loadLocalPluginsMiddlewares(appDir, middlewares) {
    const pluginsDir = path.resolve(appDir, 'plugins')
    if (!fs.existsSync(pluginsDir)) return

    const pluginsNames = fs.readdirSync(pluginsDir).filter(isNotJunk)

    for (const pluginFolder of pluginsNames) {
      // ignore files
      const stat = fs.statSync(path.resolve(pluginsDir, pluginFolder))
      if (!stat.isDirectory()) continue

      // eslint-disable-next-line no-await-in-loop
      await loadMiddlewaresInDir(
        path.resolve(pluginsDir, pluginFolder, 'middlewares'),
        middlewares
      )
    }
  }

  async function loadMiddlewareDependencies(packages, middlewares) {
    for (const packageName of packages) {
      // eslint-disable-next-line no-await-in-loop
      const files = await glob('*(index|defaults).*(js|json)', {
        cwd: path.dirname(require.resolve(`strapi-middleware-${packageName}`)),
        absolute: true,
      })
      mountMiddleware(packageName, files, middlewares)
    }
  }

  return {
    loadInternalMiddlewares,
    loadLocalMiddlewares,
    loadPluginsMiddlewares,
    loadLocalPluginsMiddlewares,
    loadMiddlewareDependencies,
  }
}

/**
 * Load middlewares
 */
module.exports = async ({ config }) => {
  const { installedMiddlewares, installedPlugins, appDir } = config

  const middlewares = {}

  const loaders = createLoaders()

  await loaders.loadMiddlewareDependencies(installedMiddlewares, middlewares)
  // internal middlewares
  await loaders.loadInternalMiddlewares(middlewares)
  // local middleware
  await loaders.loadLocalMiddlewares(appDir, middlewares)
  // plugins middlewares
  await loaders.loadPluginsMiddlewares(installedPlugins, middlewares)
  // local plugin middlewares
  await loaders.loadLocalPluginsMiddlewares(appDir, middlewares)

  return middlewares
}
