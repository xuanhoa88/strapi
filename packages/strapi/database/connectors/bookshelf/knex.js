/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs')
const path = require('path')
const debug = require('debug')('strapi-database:knex')

// Public node modules.
const _ = require('lodash')

/* eslint-disable prefer-template */
// Array of supported clients.
const CLIENTS = [
  'pg',
  'mysql',
  'mysql2',
  'sqlite3',
  'mariasql',
  'oracle',
  'strong-oracle',
  'mssql',
]

/**
 * Knex hook
 */

module.exports = (connector, connection) => {
  // Make sure we use the client even if the typo is not the exact one.
  switch (connection.client) {
    case 'postgre':
    case 'postgres':
    case 'postgresql':
      connection.client = 'pg'
      break
    case 'sqlite':
      connection.client = 'sqlite3'
      break
    case 'maria':
    case 'mariadb':
      connection.client = 'mariasql'
      break
    case 'ms':
      connection.client = 'mssql'
      break
    default:
  }

  // Make sure the client is supported.
  if (!_.includes(CLIENTS, connection.client)) {
    debug(
      'The client `' +
        connection.client +
        '` for the `' +
        connector +
        '` connection is not supported.'
    )
  }

  // Make sure the client is installed in the application
  // `node_modules` directory.
  let client
  try {
    client = require(connection.client)
  } catch (err) {
    debug('The client `' + connection.client + '` is not installed.')
    debug(
      'You can install it with `$ npm install ' +
        connection.client +
        ' --save`.'
    )
  }

  const options = _.defaultsDeep(
    {
      client: connection.client,
      connection: {
        host: _.get(connection.connection, 'host'),
        user:
          _.get(connection.connection, 'username') ||
          _.get(connection.connection, 'user'),
        password: _.get(connection.connection, 'password'),
        database: _.get(connection.connection, 'database'),
        charset: _.get(connection.connection, 'charset'),
        schema: _.get(connection.connection, 'schema', 'public'),
        port: _.get(connection.connection, 'port'),
        socketPath: _.get(connection.connection, 'socketPath'),
        ssl: _.get(connection.connection, 'ssl', false),
        timezone: _.get(connection.connection, 'timezone', 'utc'),
        filename: _.get(connection.connection, 'filename', '.tmp/data.db'),
      },
      ...connection.options,
      debug: _.get(connection.options, 'debug', false),
      pool: {
        ..._.get(connection.options, 'pool', {}),
        min: _.get(connection.options, 'pool.min', 0),
      },
    },
    {
      host: 'localhost',
      charset: 'utf8',
    }
  )

  switch (options.client) {
    case 'mysql':
      options.connection.supportBigNumbers = true
      options.connection.bigNumberStrings = true
      options.connection.typeCast = (field, next) => {
        if (field.type === 'DECIMAL' || field.type === 'NEWDECIMAL') {
          const value = field.string()
          return value === null ? null : Number(value)
        }

        if (field.type === 'TINY' && field.length === 1) {
          const value = field.string()
          return value ? value === '1' : null
        }
        return next()
      }
      break
    case 'pg':
      client.types.setTypeParser(1700, 'text', parseFloat)

      if (_.isString(_.get(options.connection, 'schema'))) {
        options.pool = {
          ...options.pool,
          afterCreate: (conn, cb) => {
            conn.query(
              `SET SESSION SCHEMA '${options.connection.schema}';`,
              (err) => {
                cb(err, conn)
              }
            )
          },
        }
      } else {
        delete options.connection.schema
      }
      break
    case 'sqlite3': {
      // Force base directory.
      // Note: it removes the warning logs when starting the administration in development mode.
      const fileDirectory = path.dirname(options.connection.filename)

      // Create the directory if it does not exist.
      try {
        fs.statSync(fileDirectory)
      } catch (err) {
        fs.mkdirSync(fileDirectory)
      }

      // Disable warn log
      // .returning() is not supported by sqlite3 and will not have any effect.
      options.log = {
        warn: () => {},
      }

      break
    }
    default:
  }

  try {
    // Try to require from local dependency.
    return require('knex')(options)
  } catch (err) {
    debug('Impossible to use the `' + connector + '` connection...')
    debug(
      'Be sure that your client `' +
        connector +
        '` are in the same node_modules directory'
    )
    debug(err)
  }
}
