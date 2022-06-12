/**
 * Module dependencies
 */

// Public node modules.
const url = require('url')
const _ = require('lodash')
const mongoose = require('mongoose')
const { Mongoose } = require('./utils/data-types')(mongoose)
const buildQueryParams = require('./build-query')
const mountModels = require('./mount-models')
const createQueryBuilder = require('./queries')

const DB_CONNECTOR = 'mongoose'

/**
 * Mongoose hook
 */

const defaults = {
  defaultConnection: DB_CONNECTOR,
  host: 'localhost',
  port: 27017,
  database: 'strapi',
  authenticationDatabase: '',
  ssl: false,
  debug: false,
}

const createConnectionURL = (opts) => {
  const { protocol, auth, host, port } = opts

  return {
    toString() {
      return `${protocol}://${auth}${host}${port}/`
    },
  }
}

module.exports = (
  db,
  { connection: { connection, options }, connector, components }
) => {
  async function mountConnectionModels(ctx) {
    await Promise.all(
      _.map(components, ({ models }) =>
        mountModels(
          {
            models: _.pickBy(models, (model) => model.connection === connector),
            target: models,
          },
          ctx
        )
      )
    )
  }

  return {
    defaults,
    async initialize() {
      const instance = new Mongoose()

      const {
        uri,
        host,
        port,
        username,
        password,
        database,
        srv,
        useUnifiedTopology,
      } = connection

      const uriOptions = uri ? url.parse(uri, true).query : {}

      const { authenticationDatabase, ssl, debug, env } = _.defaults(
        options,
        uriOptions
      )
      const isSrv = srv === true || srv === 'true'

      // Connect to mongo database
      const connectOptions = {}

      if (!_.isEmpty(username)) {
        connectOptions.user = username

        if (!_.isEmpty(password)) {
          connectOptions.pass = password
        }
      }

      if (!_.isEmpty(authenticationDatabase)) {
        connectOptions.authSource = authenticationDatabase
      }

      connectOptions.ssl = ssl === true || ssl === 'true'
      connectOptions.useNewUrlParser = true
      connectOptions.dbName = database
      connectOptions.useUnifiedTopology = useUnifiedTopology || true

      try {
        const connectionURL = createConnectionURL({
          protocol: `mongodb${isSrv ? '+srv' : ''}`,
          port: isSrv ? '' : `:${port}`,
          host,
          auth: username ? `${username}:${encodeURIComponent(password)}@` : '',
        })
        const connectionString = uri || connectionURL.toString()

        await instance.connect(connectionString, connectOptions)
      } catch (error) {
        const err = new Error(
          `Error connecting to the Mongo database. ${error.message}`
        )
        delete err.stack
        throw err
      }

      try {
        const { version } = await instance.connection.db.admin().serverInfo()
        instance.mongoDBVersion = version
      } catch {
        instance.mongoDBVersion = null
      }

      const GLOBALS = {}

      instance.set('debug', debug === true || debug === 'true')

      await mountConnectionModels({
        instance,
        GLOBALS,
        db,
        env,
      })

      db.connectors.set(DB_CONNECTOR, instance)
    },
    async destroy() {
      const mongooseConnection = db.connectors.get(DB_CONNECTOR)
      if (
        mongooseConnection instanceof Mongoose &&
        mongooseConnection.connection.readyState === 1
      ) {
        await mongooseConnection.disconnect()
      }
    },
    get defaultTimestamps() {
      return ['createdAt', 'updatedAt']
    },
    buildQuery({ model, filters, ...rest }) {
      const connectorQuery = db.connectors.get(DB_CONNECTOR)
      return buildQueryParams({ connectorQuery, model, filters, ...rest })
    },
    queries(model) {
      const connectorQuery = db.connectors.get(DB_CONNECTOR)
      return createQueryBuilder({ model, connectorQuery })
    },
  }
}
