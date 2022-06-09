const { prop, assoc } = require('lodash/fp')
const { MANY_RELATIONS } = require('@strapi/utils').relations.constants
const { isVisibleAttribute } = require('@strapi/utils').contentTypes

const createRelationsCountsQuery = ({ model, fn, connectorQuery }) => {
  // fetch counter map
  const fetchCounters = async (...args) => {
    const results = await connectorQuery.fetchRelationCounters(...args)
    return results.reduce(
      (map, { id, count }) => assoc(id, Number(count), map),
      {}
    )
  }

  return async (params, populate) => {
    const toCount = []
    const toPopulate = []

    model.associations
      .filter(
        (association) => !populate || populate.includes(association.alias)
      )
      .forEach((association) => {
        if (
          MANY_RELATIONS.includes(association.nature) &&
          isVisibleAttribute(model, association.alias)
        ) {
          return toCount.push(association)
        }

        toPopulate.push(association.alias)
      })

    const { results, pagination } = await fn(params, toPopulate)
    const resultsIds = results.map(prop('id'))

    const counters = await Promise.all(
      toCount.map(async ({ alias }) => ({
        field: alias,
        counts: await fetchCounters(alias, resultsIds),
      }))
    )

    results.forEach((entity) => {
      counters.forEach(({ field, counts }) => {
        entity[field] = { count: counts[entity.id] || 0 }
      })
    })

    return {
      results,
      pagination,
    }
  }
}

module.exports = {
  createRelationsCountsQuery,
}
