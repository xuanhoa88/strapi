const pmap = require('p-map')
const { createQueryWithLifecycles, withLifecycles } = require('./helpers')
const {
  createFindPageQuery,
  createSearchPageQuery,
} = require('./paginated-queries')

/**
 * @param {Object} opts options
 * @param {Object} opts.model The ORM model
 * @param {Object} opts.connectorQuery The ORM queries implementation
 */
module.exports = (db, opts) => {
  const { model, connectorQuery } = opts

  const createFn = createQueryWithLifecycles(db, {
    query: 'create',
    model,
    connectorQuery,
  })

  const createMany = (entities, { concurrency = 100 } = {}, ...rest) =>
    pmap(entities, (entity) => createFn(entity, ...rest), {
      concurrency,
      stopOnError: true,
    })

  const findPage = withLifecycles(db, {
    query: 'findPage',
    model,
    fn: createFindPageQuery(connectorQuery),
  })

  const searchPage = withLifecycles(db, {
    query: 'searchPage',
    model,
    fn: createSearchPageQuery(connectorQuery),
  })

  return {
    get model() {
      return model
    },

    get orm() {
      return model.orm
    },

    get primaryKey() {
      return model.primaryKey
    },

    /**
     * Run custom database logic
     */
    custom(mapping) {
      if (typeof mapping === 'function') {
        return mapping.bind(this, { model: this.model })
      }

      if (!mapping[this.orm]) {
        throw new Error(`Missing mapping for orm ${this.orm}`)
      }

      if (typeof mapping[this.orm] !== 'function') {
        throw new Error(
          `Custom queries must be functions received ${typeof mapping[
            this.orm
          ]}`
        )
      }

      return mapping[this.model.orm].call(this, { model: this.model })
    },
    createMany,
    create: createFn,
    update: createQueryWithLifecycles(db, {
      query: 'update',
      model,
      connectorQuery,
    }),
    delete: createQueryWithLifecycles(db, {
      query: 'delete',
      model,
      connectorQuery,
    }),
    find: createQueryWithLifecycles(db, {
      query: 'find',
      model,
      connectorQuery,
    }),
    findOne: createQueryWithLifecycles(db, {
      query: 'findOne',
      model,
      connectorQuery,
    }),
    count: createQueryWithLifecycles(db, {
      query: 'count',
      model,
      connectorQuery,
    }),
    search: createQueryWithLifecycles(db, {
      query: 'search',
      model,
      connectorQuery,
    }),
    countSearch: createQueryWithLifecycles(db, {
      query: 'countSearch',
      model,
      connectorQuery,
    }),

    // paginated queries
    findPage,
    searchPage,
  }
}
