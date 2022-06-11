const http = require('http')
const path = require('path')
const fs = require('fs')
const Koa = require('koa')
const serveStaticFiles = require('koa-static')
const Router = require('koa-router')
const _ = require('lodash')
const chalk = require('chalk')
const CLITable = require('cli-table3')
const { getAbsoluteServerUrl } = require('@strapi/utils')
const { createLogger } = require('@strapi/logger')
const { createDatabaseManager } = require('./database')
const register = require('./core/register')
const loadConfiguration = require('./core/load-configuration')
const loadModules = require('./core/load-modules')
const initializeMiddlewares = require('./middlewares')
const initializeHooks = require('./hooks')
const createStrapiFs = require('./core/fs')
const createValidator = require('./services/validator')
const { destroyOnSignal } = require('./utils/signals')

const LIFECYCLES = {
  REGISTER: 'register',
  BOOTSTRAP: 'bootstrap',
  DESTROY: 'destroy',
}

/**
 * Construct an Strapi instance.
 *
 * @constructor
 */
class Strapi {
  constructor(opts = {}) {
    destroyOnSignal(this)

    this.appDir = opts.appDir || process.cwd()

    this.isLoaded = false
    this.reload = this.reload()

    this.config = loadConfiguration(this.appDir, opts)

    // Expose `koa`.
    this.app = new Koa()
    this.router = new Router()

    this.initServer()

    // Logger.
    this.log = createLogger(this.config.logger, {})

    this.plugins = {}

    // internal services.
    this.fs = createStrapiFs(this)

    this.requireProjectBootstrap()
  }

  handleRequest(req, res) {
    if (!this.requestHandler) {
      this.requestHandler = this.app.callback()
    }

    return this.requestHandler(req, res)
  }

  requireProjectBootstrap() {
    const bootstrapPath = path.resolve(
      this.appDir,
      'config/functions/bootstrap.js'
    )
    if (fs.existsSync(bootstrapPath)) {
      require(bootstrapPath)
    }
  }

  logStats() {
    const columns = Math.min(process.stderr.columns, 80) - 2
    console.log()
    console.log(chalk.black.bgWhite(_.padEnd(' Project information', columns)))
    console.log()

    const infoTable = new CLITable({
      colWidths: [20, 50],
      chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
    })

    infoTable.push(
      [chalk.blue('Time'), `${new Date()}`],
      [chalk.blue('Launched in'), `${Date.now() - this.config.launchedAt} ms`],
      [chalk.blue('Environment'), this.config.environment],
      [chalk.blue('Process PID'), process.pid]
    )

    console.log(infoTable.toString())
    console.log()
    console.log(chalk.black.bgWhite(_.padEnd(' Actions available', columns)))
    console.log()
  }

  logStartupMessage() {
    this.logStats()

    console.log(chalk.bold('Welcome back!'))

    console.log(chalk.grey('To access the server ⚡️, go to:'))
    const serverUrl = getAbsoluteServerUrl(strapi.config)
    console.log(chalk.bold(serverUrl))
    console.log()
  }

  initServer() {
    this.server = http.createServer(this.handleRequest.bind(this))
    // handle port in use cleanly
    this.server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        return this.stopWithError(
          `The port ${err.port} is already used by another application.`
        )
      }

      this.log.error(err)
    })

    // Close current connections to fully destroy the server
    const connections = {}

    this.server.on('connection', (conn) => {
      const key = `${conn.remoteAddress}:${conn.remotePort}`
      connections[key] = conn

      conn.on('close', () => {
        delete connections[key]
      })
    })

    this.server.destroy = (cb) => {
      this.server.close(cb)

      for (const key in connections) {
        connections[key].destroy()
      }
    }
  }

  async start(cb) {
    try {
      if (!process.env.STRAPI_KEY) {
        throw new Error('No application encryption key has been specified.')
      }

      if (!this.isLoaded) {
        await this.initialize()
      }

      // Static files
      this.app.use(serveStaticFiles('./public'))

      // Routes
      this.app.use(this.router.routes()).use(this.router.allowedMethods())

      // Launch server.
      this.listen(cb)
    } catch (err) {
      this.stopWithError(err)
    }
  }

  async destroy() {
    if (_.has(this, 'server.destroy')) {
      await new Promise((res) => this.server.destroy(res))
    }

    await this.runLifecyclesFunctions(LIFECYCLES.DESTROY)

    await Promise.all(
      _.values(this.plugins).map((plugin) => {
        if (_.has(plugin, 'destroy') && _.isFunction(plugin.destroy)) {
          return plugin.destroy()
        }
        return Promise.resolve()
      })
    )

    if (_.has(this.db, 'destroy')) {
      await this.db.destroy()
    }

    delete global.strapi
  }

  /**
   * Add behaviors to the server
   */
  async listen(cb) {
    const onListen = async (err) => {
      if (err) return this.stopWithError(err)

      // Should the startup message be displayed?
      const hideStartupMessage = process.env.STRAPI_HIDE_STARTUP_MESSAGE
        ? process.env.STRAPI_HIDE_STARTUP_MESSAGE === 'true'
        : false

      if (hideStartupMessage === false) {
        this.logStartupMessage()
      }

      if (_.isFunction(cb)) {
        cb(this)
      }
    }

    const listenSocket = this.config.get('server.socket')
    const listenErrHandler = (err) => onListen(err).catch(this.stopWithError)

    if (listenSocket) {
      this.server.listen(listenSocket, listenErrHandler)
    } else {
      this.server.listen(
        this.config.get('server.port'),
        this.config.get('server.host'),
        listenErrHandler
      )
    }
  }

  stopWithError(err, customMessage) {
    this.log.debug(`⛔️ Server wasn't able to start properly.`)
    if (customMessage) {
      this.log.error(customMessage)
    }
    this.log.error(err)
    return this.stop()
  }

  stop(exitCode = 1) {
    // Destroy server and available connections.
    if (_.has(this, 'server.destroy')) {
      this.server.destroy()
    }

    if (this.config.autoReload) {
      process.send('stop')
    }

    // Kill process
    process.exit(exitCode)
  }

  async initialize() {
    const modules = await loadModules(this)

    this.api = modules.api
    this.plugins = modules.plugins
    this.middlewares = modules.middlewares
    this.hooks = modules.hooks
    this.helpers = modules.helpers

    await register(this)

    this.db = createDatabaseManager(this)

    await this.runLifecyclesFunctions(LIFECYCLES.REGISTER)
    await this.db.initialize()

    this.validator = createValidator(this)

    // Initialize hooks and middlewares.
    await initializeMiddlewares(this)
    await initializeHooks(this)

    await this.runLifecyclesFunctions(LIFECYCLES.BOOTSTRAP)
    await this.freeze()

    this.isLoaded = true

    return this
  }

  reload() {
    const state = {
      shouldReload: 0,
    }

    const reload = () => {
      if (state.shouldReload > 0) {
        // Reset the reloading state
        state.shouldReload -= 1
        reload.isReloading = false
        return
      }

      if (this.config.autoReload) {
        this.server.close()
        process.send('reload')
      }
    }

    Object.defineProperty(reload, 'isWatching', {
      configurable: true,
      enumerable: true,
      set: (value) => {
        // Special state when the reloader is disabled temporarly (see GraphQL plugin example).
        if (state.isWatching === false && value === true) {
          state.shouldReload += 1
        }
        state.isWatching = value
      },
      get: () => state.isWatching,
    })

    reload.isReloading = false
    reload.isWatching = true

    return reload
  }

  async runLifecyclesFunctions(lifecycleName) {
    const execLifecycle = async (fn) => {
      if (!_.isFunction(fn)) {
        return
      }

      return fn()
    }

    const configPath = `functions.${lifecycleName}`

    // plugins
    await Promise.all(
      _.keys(this.plugins).map((plugin) => {
        const pluginFunc = _.get(this.plugins[plugin], `config.${configPath}`)
        return execLifecycle(pluginFunc).catch((err) => {
          strapi.log.error(
            `${lifecycleName} function in plugin "${plugin}" failed`
          )
          strapi.log.error(err)
          strapi.stop()
        })
      })
    )

    // user
    await execLifecycle(_.get(this.config, configPath))
  }

  async freeze() {
    Object.freeze(this.config)
    Object.freeze(this.appDir)
    Object.freeze(this.plugins)
    Object.freeze(this.api)
  }
}

module.exports = (options) => {
  const strapi = new Strapi(options)
  global.strapi = strapi
  return strapi
}
