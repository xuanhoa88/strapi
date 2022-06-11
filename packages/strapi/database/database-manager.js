const _ = require('lodash')
const { createQuery } = require('./queries')
const createConnectorRegistry = require('./connector-registry')
const createLifecycleManager = require('./lifecycle-manager')

class DatabaseManager {
  constructor({ config, api, plugins }) {
    this.initialized = false

    this.config = config.get('database')

    this.components = [..._.values(api), ..._.values(plugins)]

    this.connectors = createConnectorRegistry({
      components: this.components,
      connections: this.config.connections,
      defaultConnection: this.config.defaultConnection,
    })

    this.queries = new Map()
    this.models = new Map()

    this.lifecycles = createLifecycleManager()
  }

  async initialize() {
    if (this.initialized === true) {
      throw new Error('Database manager already initialized')
    }

    this.initialized = true

    await this.connectors.initialize(this)

    return this
  }

  async destroy() {
    await Promise.all(
      this.connectors.getAll().map((connector) => connector.destroy())
    )
  }

  getModel(name) {
    if (!name) {
      throw new Error(`argument entity is required`)
    }

    const model = this.models.get(name)
    if (!model) {
      throw new Error(`The model ${name} can't be found.`)
    }

    return model
  }

  queries(name) {
    const model = this.getModel(name)

    if (this.queries.has(model.uid)) {
      return this.queries.get(model.uid)
    }

    const connectorQuery = this.connectors.get(model.orm).queries(model)

    const query = createQuery(this, {
      connectorQuery,
      model,
    })

    this.queries.set(model.uid, query)
    return query
  }
}

function createDatabaseManager(strapi) {
  return new DatabaseManager(strapi)
}

module.exports = {
  createDatabaseManager,
}
