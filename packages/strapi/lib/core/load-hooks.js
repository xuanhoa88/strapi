// Dependencies.
const path = require("path")
const fs = require("fs")
const _ = require("lodash")
const glob = require("../load/glob")
const findPackagePath = require("../load/package-path")

const mountHooks = (name, files, hooks) => {
  files.forEach((file) => {
    hooks[name] = hooks[name] || { loaded: false }

    let dependencies = []
    try {
      dependencies = _.get(
        require(`strapi-hook-${name}/package.json`),
        "strapi.dependencies",
        []
      )
    } catch (err) {
      // Silent
    }

    if (_.endsWith(file, "index.js") && !hooks[name].load) {
      Object.defineProperty(hooks[name], "load", {
        configurable: false,
        enumerable: true,
        get: () => require(file)(strapi),
      })
      hooks[name].dependencies = dependencies
      return
    }

    if (_.endsWith(file, "defaults.json")) {
      hooks[name].defaults = require(file)
    }
  })
}

const loadHooksInDir = async (dir, hooks) => {
  const files = await glob("*/*(index|defaults).*(js|json)", {
    cwd: dir,
  })

  files.forEach((f) => {
    const name = f.split("/")[0]
    mountHooks(name, [path.resolve(dir, f)], hooks)
  })
}

const loadLocalHooks = (appPath, hooks) =>
  loadHooksInDir(path.resolve(appPath, "hooks"), hooks)

const loadPluginsHooks = async (plugins, hooks) => {
  for (const pluginName of plugins) {
    const dir = path.resolve(
      findPackagePath(`strapi-plugin-${pluginName}`),
      "hooks"
    )
    await loadHooksInDir(dir, hooks)
  }
}

const loadLocalPluginsHooks = async (appPath, hooks) => {
  const pluginsDir = path.resolve(appPath, "plugins")
  if (!fs.existsSync(pluginsDir)) return

  const pluginsNames = fs.readdirSync(pluginsDir)

  for (const pluginName of pluginsNames) {
    // ignore files
    const stat = fs.statSync(path.resolve(pluginsDir, pluginName))
    if (!stat.isDirectory()) continue

    const dir = path.resolve(pluginsDir, pluginName, "hooks")
    await loadHooksInDir(dir, hooks)
  }
}

const loadHookDependencies = async (installedHooks, hooks) => {
  for (const hook of installedHooks) {
    const hookDir = path.dirname(require.resolve(`strapi-hook-${hook}`))

    const files = await glob("*(index|defaults).*(js|json)", {
      cwd: hookDir,
      absolute: true,
    })

    mountHooks(hook, files, hooks)
  }
}

/**
 * Load hooks
 */
module.exports = async ({ installedHooks, installedPlugins, appPath }) => {
  const hooks = {}

  await Promise.all([
    loadHookDependencies(installedHooks, hooks),
    // local middleware
    loadLocalHooks(appPath, hooks),
    // plugins middlewares
    loadPluginsHooks(installedPlugins, hooks),
    // local plugin middlewares
    loadLocalPluginsHooks(appPath, hooks),
  ])

  return hooks
}
