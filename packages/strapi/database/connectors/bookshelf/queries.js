/**
 * Implementation of model queries for bookshelf
 */

const _ = require('lodash')
const pmap = require('p-map')
const convertRestQueryParams = require('./utils/convert-rest-query-params')
const buildQuery = require('./utils/build-query')
const { escapeQuery } = require('./utils/string-formatting')

const BATCH_SIZE = 1000

const pickCountFilters = _.omit(['sort', 'limit', 'start'])

/**
 * util to build search query
 * @param {*} model
 * @param {*} params
 */
const buildSearchQuery =
  ({ model, params }) =>
  (qb) => {
    const query = params._q

    const stringTypes = [
      'string',
      'text',
      'uid',
      'email',
      'enumeration',
      'richtext',
    ]
    const numberTypes = ['biginteger', 'integer', 'decimal', 'float']

    const searchColumns = _.keys(model._attributes)
      .filter((attribute) =>
        stringTypes.includes(model._attributes[attribute].type)
      )
      .filter((attribute) => model._attributes[attribute].searchable !== false)

    if (!_.isNaN(_.toNumber(query))) {
      const numberColumns = _.keys(model._attributes)
        .filter((attribute) =>
          numberTypes.includes(model._attributes[attribute].type)
        )
        .filter(
          (attribute) => model._attributes[attribute].searchable !== false
        )
      searchColumns.push(...numberColumns)
    }

    if ([...numberTypes, ...stringTypes].includes(model.primaryKeyType)) {
      searchColumns.push(model.primaryKey)
    }

    // Search in columns with text using index.
    switch (model.client) {
      case 'pg':
        _.forEach(searchColumns, (attr) =>
          qb.orWhereRaw(
            `"${model.collectionName}"."${attr}"::text ILIKE ?`,
            `%${escapeQuery(query, '*%\\')}%`
          )
        )
        break
      case 'sqlite3':
        _.forEach(searchColumns, (attr) =>
          qb.orWhereRaw(
            `"${model.collectionName}"."${attr}" LIKE ? ESCAPE '\\'`,
            `%${escapeQuery(query, '*%\\')}%`
          )
        )
        break
      case 'mysql':
        _.forEach(searchColumns, (attr) =>
          qb.orWhereRaw(
            `\`${model.collectionName}\`.\`${attr}\` LIKE ?`,
            `%${escapeQuery(query, '*%\\')}%`
          )
        )
        break
      default:
    }
  }

function createQueryBuilder({ model, connectorQuery }) {
  const wrapTransaction = (fn, { transacting } = {}) => {
    if (transacting) return fn(transacting)
    return connectorQuery.transaction((trx) => fn(trx))
  }

  /**
   * Find multiple entries based on params
   */
  function find(params, populate, { transacting } = {}) {
    const filters = convertRestQueryParams(params)
    const query = buildQuery({ model, filters })

    return model
      .query(query)
      .fetchAll({
        withRelated: populate,
        transacting,
        publicationState: filters.publicationState,
      })
      .then((results) => results.toJSON())
  }

  /**
   * Find one entry based on params
   */
  async function findOne(params, populate, { transacting } = {}) {
    const entries = await find({ ...params, _limit: 1 }, populate, {
      transacting,
    })
    return entries[0] || null
  }

  /**
   * Count entries based on filters
   */
  function count(params = {}, { transacting } = {}) {
    const filters = pickCountFilters(convertRestQueryParams(params))

    return model
      .query(buildQuery({ model, filters }))
      .count({ transacting })
      .then(Number)
  }

  async function deleteOne(id, { transacting } = {}) {
    const entry = await model
      .where({ [model.primaryKey]: id })
      .fetch({ transacting })

    if (!entry) {
      const err = new Error('entry.notFound')
      err.status = 404
      throw err
    }

    await model.deleteRelations(id, { transacting })

    const runDelete = async (trx) => {
      await model
        .where({ id: entry.id })
        .destroy({ transacting: trx, require: false })
      return entry.toJSON()
    }

    return wrapTransaction(runDelete, { transacting })
  }

  async function deleteMany(
    params,
    { transacting, returning = true, batchSize = BATCH_SIZE } = {}
  ) {
    if (params[model.primaryKey]) {
      const entries = await find({ ...params, _limit: 1 }, null, {
        transacting,
      })
      if (entries.length > 0) {
        return deleteOne(entries[0][model.primaryKey], { transacting })
      }
      return null
    }

    if (returning) {
      const paramsWithDefaults = _.defaults(params, { _limit: -1 })
      const entries = await find(paramsWithDefaults, null, { transacting })
      return pmap(entries, (entry) => deleteOne(entry.id, { transacting }), {
        concurrency: 100,
        stopOnError: true,
      })
    }

    // returning false, we can optimize the function
    const batchParams = _.assign({}, params, {
      _limit: batchSize,
      _sort: 'id:ASC',
    })

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const batch = await find(batchParams, null, { transacting })

      // eslint-disable-next-line no-await-in-loop
      await pmap(batch, (entry) => deleteOne(entry.id, { transacting }), {
        concurrency: 100,
        stopOnError: true,
      })

      if (batch.length < BATCH_SIZE) {
        break
      }
    }
  }

  function search(params, populate) {
    const filters = convertRestQueryParams(_.omit(params, '_q'))

    return model
      .query((qb) => qb.where(buildSearchQuery({ model, params })))
      .query(buildQuery({ model, filters }))
      .fetchAll({ withRelated: populate })
      .then((results) => results.toJSON())
  }

  function countSearch(params) {
    const countParams = _.omit(['_q'], params)
    const filters = pickCountFilters(convertRestQueryParams(countParams))

    return model
      .query((qb) => qb.where(buildSearchQuery({ model, params })))
      .query(buildQuery({ model, filters }))
      .count()
      .then(Number)
  }

  return {
    findOne,
    find,
    count,
    search,
    countSearch,
    delete: deleteMany,
  }
}

module.exports = {
  createQueryBuilder,
}
