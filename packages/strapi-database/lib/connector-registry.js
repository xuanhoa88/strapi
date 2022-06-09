/**
 * Database connector registry
 */

const _ = require('lodash')
const requireConnector = require('./require-connector')

const createConnectorRegistry = ({ defaultConnection, connections }) => {
  const connectors = new Map()

  return {
    /**
     * Load connector modules
     */
    load() {
      for (const connection of _.values(connections)) {
        const { connector } = connection
        if (!connectors.has(connector)) {
          connectors.set(connector, requireConnector(connector)(strapi))
        }
      }
    },

    /**
     * Initialize connectors
     */
    async initialize() {
      for (const connector of connectors.values()) {
        await connector.initialize()
      }
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
      const defaultConnector = connections[defaultConnection].connector
      return connectors.get(defaultConnector)
    },

    getByConnection(connection) {
      if (!_.has(connections, connection)) {
        throw new Error(
          'Trying to access a connector for an unknown connection'
        )
      }

      const connectorKey = connections[connection].connector
      return connectors.get(connectorKey)
    },
  }
}

module.exports = createConnectorRegistry
