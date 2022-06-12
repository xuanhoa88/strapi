/**
 * Implementation of model queries for mongo
 */

const _ = require('lodash')
const pmap = require('p-map')
const convertRestQueryParams = require('./utils/convert-rest-query-params')
const buildQueryParams = require('./utils/build-query')

const BATCH_SIZE = 1000

const pickCountFilters = _.omit(['sort', 'limit', 'start'])

module.exports = ({ model }) => {
  function find(params, populate, { session = null } = {}) {
    const filters = convertRestQueryParams(params)
    return buildQueryParams({
      model,
      filters,
      populate,
      session,
    }).then((results) =>
      results.map((result) => (result ? result.toObject() : null))
    )
  }

  async function findOne(params, populate, { session = null } = {}) {
    const entries = await find({ ...params, _limit: 1 }, populate, { session })
    return entries[0] || null
  }

  function count(params, { session = null } = {}) {
    const filters = pickCountFilters(convertRestQueryParams(params))

    return buildQueryParams({ model, filters, session }).count()
  }

  async function deleteMany(
    params,
    { session = null, returning = true, batchSize = BATCH_SIZE } = {}
  ) {
    if (params[model.primaryKey]) {
      const entries = await find({ ...params, _limit: 1 }, null, { session })
      if (entries.length > 0) {
        return deleteOne(entries[0][model.primaryKey], { session })
      }
      return null
    }

    if (returning) {
      const entries = await find(params, null, { session })
      return pmap(
        entries,
        (entry) => deleteOne(entry[model.primaryKey], { session }),
        {
          concurrency: 100,
          stopOnError: true,
        }
      )
    }

    // returning false, we can optimize the function
    const batchParams = _.assign({}, params, {
      _limit: batchSize,
      _sort: 'id:ASC',
    })
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const batch = await find(batchParams, null, { session })
      await pmap(
        batch,
        (entry) => deleteOne(entry[model.primaryKey], { session }),
        {
          concurrency: 100,
          stopOnError: true,
        }
      )

      if (batch.length < BATCH_SIZE) {
        break
      }
    }
  }

  async function deleteOne(id, { populate, session = null } = {}) {
    const entry = await model
      .findOneAndRemove({ [model.primaryKey]: id }, { session })
      .populate(populate)

    if (!entry) {
      const err = new Error('entry.notFound')
      err.status = 404
      throw err
    }

    return entry.toObject ? entry.toObject() : null
  }

  function search(params, populate, { session = null } = {}) {
    const filters = convertRestQueryParams(_.omit(params, '_q'))

    return buildQueryParams({
      model,
      filters,
      searchParam: params._q,
      populate,
      session,
    }).then((results) =>
      results.map((result) => (result ? result.toObject() : null))
    )
  }

  function countSearch(params, { session = null } = {}) {
    const countParams = _.omit(['_q'], params)
    const filters = pickCountFilters(convertRestQueryParams(countParams))

    return buildQueryParams({
      model,
      filters,
      searchParam: params._q,
      session,
    }).count()
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
