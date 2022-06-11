const cluster = require('cluster')
const chokidar = require('chokidar')
const { createLogger } = require('@strapi/logger')
const loadConfiguration = require('../core/load-configuration')
const strapi = require('../Strapi')

/**
 * Init file watching to auto restart strapi app
 * @param {Object} options - Options object
 * @param {string} options.appDir - This is the path where the app is located, the watcher will watch the files under this folder
 * @param {Strapi} options.strapi - Strapi instance
 * @param {array} options.watchIgnoreFiles - Array of custom file paths that should not be watched
 */
function watchFileChanges({
  appDir,
  strapiInstance,
  watchIgnoreFiles,
  polling,
}) {
  const restart = () => {
    if (
      strapiInstance.reload.isWatching &&
      !strapiInstance.reload.isReloading
    ) {
      strapiInstance.reload.isReloading = true
      strapiInstance.reload()
    }
  }

  const watcher = chokidar.watch(appDir, {
    ignoreInitial: true,
    usePolling: polling,
    ignored: [
      /(^|[/\\])\../, // dot files
      /tmp/,
      '**/node_modules',
      '**/node_modules/**',
      '**/plugins.json',
      '**/index.html',
      '**/public',
      '**/public/**',
      '**/*.db*',
      '**/exports/**',
      ...watchIgnoreFiles,
    ],
  })

  watcher
    .on('add', (path) => {
      strapiInstance.log.info(`File created: ${path}`)
      restart()
    })
    .on('change', (path) => {
      strapiInstance.log.info(`File changed: ${path}`)
      restart()
    })
    .on('unlink', (path) => {
      strapiInstance.log.info(`File deleted: ${path}`)
      restart()
    })
}

/**
 * `$ strapi develop`
 *
 */
module.exports = async ({ polling }) => {
  const appDir = process.cwd()
  const config = loadConfiguration(appDir)
  const logger = createLogger(config.logger, {})

  try {
    if (cluster.isMaster) {
      cluster.on('message', (worker, message) => {
        switch (message) {
          case 'reload':
            logger.info('The server is restarting\n')
            worker.send('isKilled')
            break
          case 'kill':
            worker.kill()
            cluster.fork()
            break
          case 'stop':
            worker.kill()
            process.exit(1)
            break
          default:
        }
      })

      cluster.fork()
    }

    if (cluster.isWorker) {
      const strapiInstance = strapi({
        appDir,
        autoReload: true,
      })
      await strapiInstance.start()

      const watchIgnoreFiles = strapiInstance.config.get(
        'server.watchIgnoreFiles',
        []
      )

      watchFileChanges({
        appDir,
        strapiInstance,
        watchIgnoreFiles,
        polling,
      })

      process.on('message', (message) => {
        switch (message) {
          case 'isKilled':
            strapiInstance.server.destroy(() => {
              process.send('kill')
            })
            break
          default:
          // Do nothing.
        }
      })
    }
  } catch (e) {
    console.log(e)
    logger.error(e)
    process.exit(1)
  }
}
