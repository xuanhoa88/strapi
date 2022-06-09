const _ = require('lodash')

const createConnectorRegistry = require('./connector-registry')
const { validateModelSchemas } = require('./validation')

class DatabaseManager {
  constructor(strapi) {
    this.strapi = strapi

    this.initialized = false

    this.connectors = createConnectorRegistry({
      connections: strapi.config.get('database.connections'),
      defaultConnection: strapi.config.get('database.defaultConnection'),
    })

    this.models = new Map()
  }

  async initialize() {
    if (this.initialized === true) {
      throw new Error('Database manager already initialized')
    }

    this.initialized = true

    this.connectors.load()

    validateModelSchemas({ strapi: this.strapi, manager: this })

    await this.connectors.initialize()

    this.initializeModelsMap()

    return this
  }

  async destroy() {
    await Promise.all(
      this.connectors.getAll().map((connector) => connector.destroy())
    )
  }

  initializeModelsMap() {
    _.keys(this.strapi.api).forEach((apiKey) => {
      _.keys(this.strapi.api[apiKey].models).forEach((modelKey) => {
        const model = this.strapi.api[apiKey].models[modelKey]
        this.models.set(model.uid, model)
      })
    })

    _.keys(this.strapi.plugins).forEach((pluginKey) => {
      _.keys(this.strapi.plugins[pluginKey].models).forEach((modelKey) => {
        const model = this.strapi.plugins[pluginKey].models[modelKey]
        this.models.set(model.uid, model)
      })
    })
  }

  getModelByGlobalId(globalId) {
    return Array.from(this.models.values()).find(
      (model) => model.globalId === globalId
    )
  }
}

function createDatabaseManager(strapi) {
  return new DatabaseManager(strapi)
}

module.exports = {
  createDatabaseManager,
}
