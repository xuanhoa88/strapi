/**
 * Converts the standard Strapi REST query params to a moe usable format for querying
 * You can read more here: https://strapi.io/documentation/developer-docs/latest/developer-resources/content-api/content-api.html#filters
 */

const _ = require('lodash')

const BOOLEAN_OPERATORS = ['or', 'and']
const QUERY_OPERATORS = ['_where', '_or', '_and']

// List of all the possible filters
const VALID_REST_OPERATORS = [
  'eq',
  'ne',
  'in',
  'nin',
  'contains',
  'ncontains',
  'containss',
  'ncontainss',
  'lt',
  'lte',
  'gt',
  'gte',
  'null',
]

/**
 * Sort query parser
 * @param {string} sortQuery - ex: id:asc,price:desc
 */
const convertSortQueryParams = (sortQuery) => {
  if (typeof sortQuery !== 'string') {
    throw new Error(
      `convertSortQueryParams expected a string, got ${typeof sortQuery}`
    )
  }

  const sortKeys = []

  _.split(sortQuery, ',').forEach((part) => {
    // split field and order param with default order to ascending
    const [field, order = 'asc'] = part.split(':')

    if (field.length === 0) {
      throw new Error('Field cannot be empty')
    }

    if (!['asc', 'desc'].includes(order.toLocaleLowerCase())) {
      throw new Error('order can only be one of asc|desc|ASC|DESC')
    }

    sortKeys.push({ field, order: order.toLowerCase() })
  })

  return {
    sort: sortKeys,
  }
}

/**
 * Start query parser
 * @param {string} startQuery - ex: id:asc,price:desc
 */
const convertStartQueryParams = (startQuery) => {
  const startAsANumber = _.toNumber(startQuery)

  if (!_.isInteger(startAsANumber) || startAsANumber < 0) {
    throw new Error(
      `convertStartQueryParams expected a positive integer got ${startAsANumber}`
    )
  }

  return {
    start: startAsANumber,
  }
}

/**
 * Limit query parser
 * @param {string} limitQuery - ex: id:asc,price:desc
 */
const convertLimitQueryParams = (limitQuery) => {
  const limitAsANumber = _.toNumber(limitQuery)

  if (
    !_.isInteger(limitAsANumber) ||
    (limitAsANumber !== -1 && limitAsANumber < 0)
  ) {
    throw new Error(
      `convertLimitQueryParams expected a positive integer got ${limitAsANumber}`
    )
  }

  return {
    limit: limitAsANumber,
  }
}

/**
 * Convert params prefixed with _ by removing the prefix after we have handle the internal params
 * NOTE: This is only a temporary patch for v3 to handle extra params coming from plugins
 * @param {object} params
 * @returns {object}
 */
const convertExtraRootParams = (params) =>
  _.entries(params).reduce((acc, [key, value]) => {
    if (_.startsWith(key, '_') && !QUERY_OPERATORS.includes(key)) {
      acc[key.slice(1)] = value
    } else {
      acc[key] = value
    }

    return acc
  }, {})

/**
 * Parse where params
 */
const convertWhereParams = (whereParams) => {
  const finalWhere = []

  if (_.isArray(whereParams)) {
    return whereParams.reduce(
      (acc, whereParam) => acc.concat(convertWhereParams(whereParam)),
      []
    )
  }

  _.keys(whereParams).forEach((whereClause) => {
    const {
      field,
      operator = 'eq',
      value,
    } = convertWhereClause(whereClause, whereParams[whereClause])

    finalWhere.push({
      field,
      operator,
      value,
    })
  })

  return finalWhere
}

/**
 * Parse single where param
 * @param {string} whereClause - Any possible where clause e.g: id_ne text_ncontains
 * @param {string} value - the value of the where clause e.g id_ne=value
 */
const convertWhereClause = (whereClause, value) => {
  const separatorIndex = whereClause.lastIndexOf('_')

  // eq operator
  if (separatorIndex === -1) {
    return { field: whereClause, value }
  }

  // split field and operator
  const field = whereClause.substring(0, separatorIndex)
  const operator = whereClause.slice(separatorIndex + 1)

  if (BOOLEAN_OPERATORS.includes(operator) && field === '') {
    return {
      field: null,
      operator,
      value: [].concat(value).map(convertWhereParams),
    }
  }

  // the field as underscores
  if (!VALID_REST_OPERATORS.includes(operator)) {
    return { field: whereClause, value }
  }

  return { field, operator, value }
}

/**
 * Global converter
 * @param {Object} params
 * @param defaults
 */
const convertRestQueryParams = (params = {}, defaults = {}) => {
  if (typeof params !== 'object' || params === null) {
    throw new Error(
      `convertRestQueryParams expected an object got ${
        params === null ? 'null' : typeof params
      }`
    )
  }

  const finalParams = { start: 0, limit: 100, ...defaults }

  if (_.keys(params).length === 0) {
    return finalParams
  }

  if (_.has(params, '_sort')) {
    Object.assign(finalParams, convertSortQueryParams(params._sort))
  }

  if (_.has(params, '_start')) {
    Object.assign(finalParams, convertStartQueryParams(params._start))
  }

  if (_.has(params, '_limit')) {
    Object.assign(finalParams, convertLimitQueryParams(params._limit))
  }

  const whereParams = convertExtraRootParams(
    _.omit(params, ['_sort', '_start', '_limit', '_where'])
  )

  const whereClauses = []

  if (_.keys(whereParams).length > 0) {
    whereClauses.push(...convertWhereParams(whereParams))
  }

  if (_.has(params, '_where')) {
    whereClauses.push(...convertWhereParams(params._where))
  }

  Object.assign(finalParams, { where: whereClauses })

  return finalParams
}

module.exports = {
  convertRestQueryParams,
}
