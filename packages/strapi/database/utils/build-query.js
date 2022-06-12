const _ = require('lodash')
const debug = require('debug')('strapi-database:mongoose')
const parseType = require('./parse-type')

const isAttribute = (model, field) =>
  _.has(model.attributes, field) || model.primaryKey === field || field === 'id'

/**
 * Returns the model, attribute name and association from a path of relation
 * @param {Object} options - Options
 * @param {Object} options.model - Strapi model
 * @param {string} options.field - path of relation / attribute
 */
const getAssociationFromFieldKey = ({ model, field }) => {
  const fieldParts = _.split(field, '.')

  let attribute

  for (let i = 0; i < fieldParts.length; i++) {
    const part = fieldParts[i]
    attribute = part

    if (!isAttribute(model, part) || i !== fieldParts.length - 1) {
      const err = new Error(
        `Your filters contain a field '${field}' that doesn't appear on your model definition nor its relations`
      )

      err.status = 400
      throw err
    }
  }

  return {
    model,
    attribute,
  }
}

/**
 * Cast basic values based on attribute type
 * @param {Object} options - Options
 * @param {string} options.type - type of the atribute
 * @param {*} options.value - value tu cast
 * @param {string} options.operator - name of operator
 */
const castValue = ({ type, value, operator }) => {
  if (operator === 'null') return parseType({ type: 'boolean', value })
  return parseType({ type, value })
}

/**
 * Cast an input value
 * @param {Object} options - Options
 * @param {string} options.type - type of the atribute
 * @param {*} options.value - value tu cast
 * @param {string} options.operator - name of operator
 */
const castInput = ({ type, value, operator }) =>
  _.isArray(value)
    ? _.map(value, (val) => castValue({ type, operator, value: val }))
    : castValue({ type, operator, value })

/**
 *
 * @param {Object} options - Options
 * @param {string} options.model - The model
 * @param {string} options.field - path of relation / attribute
 */
const normalizeFieldName = ({ model, field }) => {
  const fieldPath = _.split(field, '.')
  return _.last(fieldPath) === 'id'
    ? _.initial(fieldPath).concat(model.primaryKey).join('.')
    : fieldPath.join('.')
}

const BOOLEAN_OPERATORS = ['or', 'and']

const hasDeepFilters = ({ where = [], sort = [] }, { minDepth = 1 } = {}) => {
  // A query uses deep filtering if some of the clauses contains a sort or a match expression on a field of a relation

  // We don't use minDepth here because deep sorting is limited to depth 1
  const hasDeepSortClauses = _.some(sort, ({ field }) => field.includes('.'))

  const hasDeepWhereClauses = _.some(where, ({ field, operator, value }) => {
    if (BOOLEAN_OPERATORS.includes(operator)) {
      return _.some(value, (clauses) => hasDeepFilters({ where: clauses }))
    }

    return _.split(field, '.').length > minDepth
  })

  return hasDeepSortClauses || hasDeepWhereClauses
}

const normalizeWhereClauses = (whereClauses, { model }) =>
  whereClauses
    .filter(({ field, value }) => {
      if (_.isNull(value)) {
        return false
      }
      if (_.isUndefined(value)) {
        debug(
          `The value of field: '${field}', in your where filter, is undefined.`
        )
        return false
      }
      return true
    })
    .map(({ field, operator, value }) => {
      if (BOOLEAN_OPERATORS.includes(operator)) {
        return {
          field,
          operator,
          value: _.map(value, (clauses) =>
            normalizeWhereClauses(clauses, { model })
          ),
        }
      }

      const { model: assocModel, attribute } = getAssociationFromFieldKey({
        model,
        field,
      })

      const { type } = _.get(assocModel, ['attributes', attribute], {})

      // cast value or array of values
      const castedValue = castInput({ type, operator, value })

      return {
        operator,
        field: normalizeFieldName({ model, field }),
        value: castedValue,
      }
    })

const normalizeSortClauses = (clauses, { model }) => {
  const normalizedClauses = _.map(clauses, ({ field, order }) => ({
    field: normalizeFieldName({ model, field }),
    order,
  }))

  normalizedClauses.forEach(({ field }) => {
    const fieldDepth = _.split(field, '.').length - 1
    if (fieldDepth === 1) {
      // Check if the relational field exists
      getAssociationFromFieldKey({ model, field })
    } else if (fieldDepth > 1) {
      const err = new Error(
        `Sorting on ${field} is not possible: you cannot sort at a depth greater than 1`
      )
      err.status = 400
      throw err
    }
  })

  return normalizedClauses
}

/**
 *
 * @param {Object} options - Options
 * @param {Object} options.model - The model for which the query will be built
 * @param {Object} options.filters - The filters for the query (start, sort, limit, and where clauses)
 * @param {Object} options.rest - In case the database layer requires any other params pass them
 */
const buildQueryParams = ({ connectorQuery, model, filters = {}, ...rest }) => {
  const { where, sort } = filters

  // Validate query clauses
  if ([where, sort].some(_.isArray)) {
    if (hasDeepFilters({ where, sort }, { minDepth: 2 })) {
      debug(
        'Deep filtering queries should be used carefully (e.g Can cause performance issues).\nWhen possible build custom routes which will in most case be more optimised.'
      )
    }

    if (sort) {
      filters.sort = normalizeSortClauses(sort, { model })
    }

    if (where) {
      // Cast where clauses to match the inner types
      filters.where = normalizeWhereClauses(where, { model })
    }
  }

  // call the ORM's build query implementation
  return connectorQuery.buildQuery({ model, filters, ...rest })
}

module.exports = {
  buildQueryParams,
  hasDeepFilters,
  getAssociationFromFieldKey,
}
