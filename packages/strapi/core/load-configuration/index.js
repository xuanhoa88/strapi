const os = require('os')
const path = require('path')
const _ = require('lodash')
const dotenv = require('dotenv')

const dotenvPath = path.resolve(process.cwd(), '.env')
const { parsed: dotenvParsed } = dotenv.config({ path: dotenvPath })

process.env.NODE_ENV = process.env.NODE_ENV || 'development'

const getPrefixedDeps = require('../../utils/get-prefixed-dependencies')
const loadPolicies = require('../load-policies')
const loadFunctions = require('../load-functions')
const loadConfigDir = require('./config-loader')
const createConfigProvider = require('./config-provider')

const CONFIG_PATHS = {
  api: 'api',
  config: 'config',
  plugins: 'plugins',
  policies: 'policies',
}

const defaultConfig = {
  server: {
    host: process.env.STRAPI_HOST || os.hostname() || '0.0.0.0',
    port: process.env.STRAPI_PORT || 1337,
    cron: { enabled: false },
  },
  middleware: {
    timeout: 1000,
    load: {
      before: ['responseTime', 'logger', 'cors', 'responses', 'gzip'],
      order: [],
      after: ['parser', 'router'],
    },
    settings: {},
  },
  hook: {
    timeout: 1000,
    load: { before: [], order: [], after: [] },
    settings: {},
  },
  routes: {},
  functions: {},
  policies: {},
}

module.exports = (appDir, initialConfig = {}) => {
  const { autoReload = false } = initialConfig

  const pkgJSON = require(path.resolve(appDir || process.cwd(), 'package.json'))

  const configDir = path.resolve(appDir || process.cwd(), 'config')

  const rootConfig = {
    appDir,
    launchedAt: Date.now(),
    paths: CONFIG_PATHS,
    autoReload,
    environment: process.env.NODE_ENV,
    installedPlugins: getPrefixedDeps('strapi-plugin', pkgJSON),
    installedMiddlewares: getPrefixedDeps('strapi-middleware', pkgJSON),
    installedHooks: getPrefixedDeps('strapi-hooks', pkgJSON),
    installedProviders: getPrefixedDeps('strapi-provider', pkgJSON),
  }

  const baseConfig = {
    ...loadConfigDir(configDir),
    policies: loadPolicies(path.resolve(configDir, 'policies')),
    functions: loadFunctions(path.resolve(configDir, 'functions')),
  }

  const envConfig = loadConfigDir(
    path.resolve(configDir, 'environments', process.env.NODE_ENV)
  )
  return createConfigProvider(
    _.merge(rootConfig, defaultConfig, baseConfig, envConfig, {
      __dotenv: {
        path: dotenvPath,
        parsed: dotenvParsed,
      },
    })
  )
}
