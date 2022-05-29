// Dependencies.
const path = require("path")
const fs = require("fs")
const _ = require("lodash")
const glob = require("../load/glob")
const findPackagePath = require("../load/package-path")

/**
 * Build loader functions
 * @param {*} strapi - strapi instance
 */
const createLoaders = (strapi) => {
  async function loadMiddlewaresInDir(dir, middlewares) {
    const files = await glob("*/*(index|defaults).*(js|json)", {
      cwd: dir,
    })

    files.forEach((f) => {
      const name = f.split("/")[0]
      mountMiddleware(name, [path.resolve(dir, f)], middlewares)
    })
  }

  function loadInternalMiddlewares(middlewares) {
    return loadMiddlewaresInDir(
      path.resolve(__dirname, "..", "middlewares"),
      middlewares
    )
  }

  function loadLocalMiddlewares(appPath, middlewares) {
    return loadMiddlewaresInDir(
      path.resolve(appPath, "middlewares"),
      middlewares
    )
  }

  async function loadPluginsMiddlewares(plugins, middlewares) {
    for (const pluginName of plugins) {
      const dir = path.resolve(
        findPackagePath(`strapi-plugin-${pluginName}`),
        "middlewares"
      )
      await loadMiddlewaresInDir(dir, middlewares)
    }
  }

  async function loadLocalPluginsMiddlewares(appPath, middlewares) {
    const pluginsDir = path.resolve(appPath, "plugins")
    if (!fs.existsSync(pluginsDir)) return

    const pluginsNames = fs.readdirSync(pluginsDir)

    for (const pluginFolder of pluginsNames) {
      // ignore files
      const stat = fs.statSync(path.resolve(pluginsDir, pluginFolder))
      if (!stat.isDirectory()) continue

      const dir = path.resolve(pluginsDir, pluginFolder, "middlewares")
      await loadMiddlewaresInDir(dir, middlewares)
    }
  }

  async function loadMiddlewareDependencies(packages, middlewares) {
    for (const packageName of packages) {
      const baseDir = path.dirname(
        require.resolve(`strapi-middleware-${packageName}`)
      )
      const files = await glob("*(index|defaults).*(js|json)", {
        cwd: baseDir,
        absolute: true,
      })

      mountMiddleware(packageName, files, middlewares)
    }
  }

  function mountMiddleware(name, files, middlewares) {
    files.forEach((file) => {
      middlewares[name] = middlewares[name] || { loaded: false }
      if (_.endsWith(file, "index.js") && !middlewares[name].load) {
        return Object.defineProperty(middlewares[name], "load", {
          configurable: false,
          enumerable: true,
          get: () => require(file)(strapi),
        })
      }

      if (_.endsWith(file, "defaults.json")) {
        middlewares[name].defaults = require(file)
      }
    })
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
module.exports = async (strapi) => {
  const { installedMiddlewares, installedPlugins, appPath } = strapi.config

  const middlewares = {}

  const loaders = createLoaders(strapi)

  await loaders.loadMiddlewareDependencies(installedMiddlewares, middlewares)
  // internal middlewares
  await loaders.loadInternalMiddlewares(middlewares)
  // local middleware
  await loaders.loadLocalMiddlewares(appPath, middlewares)
  // plugins middlewares
  await loaders.loadPluginsMiddlewares(installedPlugins, middlewares)
  // local plugin middlewares
  await loaders.loadLocalPluginsMiddlewares(appPath, middlewares)

  return middlewares
}
