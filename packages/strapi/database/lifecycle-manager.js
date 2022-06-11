const debug = require('debug')('strapi-database:lifecycle')
const _ = require('lodash')

class LifecycleManager {
  constructor() {
    debug('Initialize lifecycle manager')
    this.lifecycles = []
  }

  register(lifecycle) {
    debug('Register lifecycle')

    this.lifecycles.push(lifecycle)
    return this
  }

  async run(action, model, ...args) {
    for (const lifecycle of this.lifecycles) {
      if (!_.isNil(lifecycle.model) && lifecycle.model !== model.uid) {
        continue
      }

      if (_.isFunction(lifecycle[action])) {
        debug(`Run lifecycle ${action} for model ${model.uid}`)

        await lifecycle[action](...args)
      }
    }
  }
}

module.exports = () => new LifecycleManager()
