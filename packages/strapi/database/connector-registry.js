/**
 * Database connector registry
 */

const _ = require('lodash')
const requireConnector = require('./require-connector')

module.exports = ({ defaultConnection, connections, components }) => {
  const connectors = new Map()

  return {
    /**
     * Initialize connectors
     */
    async initialize(db) {
      await Promise.all(
        _.keys(connections).map((connector) => {
          if (!connectors.has(connector)) {
            const connectorInstance = requireConnector(db, {
              connection: connections[connector],
              connector,
              components,
            })
            connectors.set(connector, connectorInstance)
            return connectorInstance.initialize()
          }
          return Promise.resolve()
        })
      )
    },

    getAll() {
      return Array.from(connectors.values())
    },

    get(key) {
      return connectors.get(key)
    },

    set(key, val) {
      connectors.set(key, val)
      return this
    },

    get default() {
      return connectors.get(defaultConnection)
    },

    getByConnection(connection) {
      if (!connectors.has(connectors, connection)) {
        throw new Error(
          'Trying to access a connector for an unknown connection'
        )
      }
      return connectors.get(connection)
    },
  }
}
