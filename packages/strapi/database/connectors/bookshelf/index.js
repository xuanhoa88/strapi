/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash')

// Local helpers.
const Bookshelf = require('./lib/bookshelf')
const mountModels = require('./mount-models')
const { createQueryBuilder } = require('./queries')
const initKnex = require('./knex')
const buildQueryParams = require('./utils/build-query')

const DB_CONNECTOR = 'bookshelf'

/**
 * Default options
 */
const defaults = {
  defaultConnection: DB_CONNECTOR,
  host: 'localhost',
}

/**
 * Bookshelf hook
 */
module.exports = (db, { connection, connector, components }) => {
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
      const GLOBALS = {}

      // Create Knex instance.
      const knex = initKnex(connector, connection)

      // Create Bookshelf instance for this connection.
      const ORM = new Bookshelf(knex)

      await mountConnectionModels({
        GLOBALS,
        connection,
        ORM,
        db,
      })

      // Run all migrations that have not yet been run.
      await knex.migrate.latest()

      db.connectors.set(DB_CONNECTOR, ORM)
    },
    async destroy() {
      const bookshelfConnection = db.connectors.get(DB_CONNECTOR)
      if (bookshelfConnection) {
        await bookshelfConnection.destroy()
      }
    },
    get defaultTimestamps() {
      return ['created_at', 'updated_at']
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
