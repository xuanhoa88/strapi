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
  controllers: 'controllers',
  models: 'models',
  plugins: 'plugins',
  policies: 'policies',
  services: 'services',
}

const defaultConfig = {
  server: {
    host: process.env.STRAPI_HOST || os.hostname() || '0.0.0.0',
    port: process.env.STRAPI_PORT || 1337,
    cron: { enabled: false },
  },
  middlewares: {
    timeout: 1000,
    load: {
      before: ['responseTime', 'logger', 'cors', 'responses', 'gzip'],
      order: [],
      after: ['parser', 'router'],
    },
    settings: {},
  },
  hooks: {
    timeout: 1000,
    load: { before: [], order: [], after: [] },
    settings: {},
  },
  routes: {},
  functions: {},
  policies: {},
}

module.exports = (appPath, initialConfig = {}) => {
  const { autoReload = false } = initialConfig

  const pkgJSON = require(path.resolve(appPath, 'package.json'))

  const configDir = path.resolve(appPath || process.cwd(), 'config')

  const rootConfig = {
    appPath,
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
