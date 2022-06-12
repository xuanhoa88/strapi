const _ = require('lodash')

/**
 * Extend the behavior of an already existing populate query, and bind generated (from options) ones to it
 * @param fns
 * @param options
 * @returns {function(...[*]=)}
 */
const extendWithPopulateQueries = (fns) => (qb) =>
  _.filter(fns, _.isFunction).map((fn) => fn(qb))

/**
 * Transforms queryOptions (e.g { publicationState: 'live' })
 * into query map
 * {
 *   publicationState: { query: 'live', ...context }
 * }
 * @param {{ [key: string]: string }} queryOptions
 * @param {object} context
 */
const queryOptionsToQueryMap = (queryOptions, context) =>
  _.keys(queryOptions).reduce((acc, key) => {
    acc[key] = { query: queryOptions[key], ...context }
    return acc
  }, {})

module.exports = {
  extendWithPopulateQueries,
  queryOptionsToQueryMap,
}
