const _ = require('lodash')
const { isNil, isEmpty, set, omit, assoc } = require('lodash/fp')
const semver = require('semver')
const { isMongoId, valueToId } = require('./utils')
const {
  hasDeepFilters,
  getAssociationFromFieldKey,
} = require('../../utils/build-query')

const sortOrderMapper = {
  asc: 1,
  desc: -1,
}

const BOOLEAN_OPERATORS = ['or']

const combineSearchAndWhere = (search = [], wheres = []) => {
  const criterias = {}
  if (search.length > 0 && wheres.length > 0) {
    criterias.$and = [{ $and: wheres }, { $or: search }]
  } else if (search.length > 0) {
    criterias.$or = search
  } else if (wheres.length > 0) {
    criterias.$and = wheres
  }
  return criterias
}

const buildSearchOr = (model, query) => {
  if (typeof query !== 'string') {
    return []
  }

  const searchOr = _.keys(model.attributes).reduce((acc, curr) => {
    if (model.attributes[curr].searchable === false) {
      return acc
    }
    switch (model.attributes[curr].type) {
      case 'biginteger':
      case 'integer':
      case 'float':
      case 'decimal':
        if (!_.isNaN(_.toNumber(query))) {
          const mongoVersion = model.db.base.mongoDBVersion
          if (semver.valid(mongoVersion) && semver.gt(mongoVersion, '4.2.0')) {
            return acc.concat({
              $expr: {
                $regexMatch: {
                  input: { $toString: `$${curr}` },
                  regex: _.escapeRegExp(query),
                },
              },
            })
          }
          return acc.concat({ [curr]: _.toNumber(query) })
        }
        return acc
      case 'string':
      case 'text':
      case 'richtext':
      case 'email':
      case 'enumeration':
      case 'uid':
        return acc.concat({
          [curr]: { $regex: _.escapeRegExp(query), $options: 'i' },
        })
      default:
        return acc
    }
  }, [])

  if (isMongoId(query)) {
    searchOr.push({ _id: query })
  }

  return searchOr
}

/**
 * Order a list of entities based on an indexMap
 * @param {Object} indexMap - index map of the form { [id]: index }
 */
const orderByIndexMap = (indexMap) => (entities) =>
  entities
    .reduce((acc, entry) => {
      // eslint-disable-next-line no-underscore-dangle
      acc[indexMap[entry._id]] = entry
      return acc
    }, [])
    .filter((entity) => !isNil(entity))

/**
 * Apply sort limit and start params
 * @param {Object} options - Options
 * @param {Object} options.query - Mongoose query
 * @param {Object} options.filters - Filters object
 */
const applyQueryParams = ({ query, filters }) => {
  if (_.has(filters, 'sort')) {
    const sortFilter = filters.sort.reduce((acc, sort) => {
      const { field, order } = sort
      acc[field] = sortOrderMapper[order]
      return acc
    }, {})

    query = query.sort(sortFilter)
  }

  // Apply start param
  if (_.has(filters, 'start')) {
    query = query.skip(filters.start)
  }

  // Apply limit param
  if (_.has(filters, 'limit') && filters.limit >= 0) {
    query = query.limit(filters.limit)
  }

  return query
}

/**
 * Builds a where clause
 * @param {Object} options - Options
 * @param {string} options.field - Where clause field
 * @param {string} options.operator - Where clause operator
 * @param {*} options.value - Where clause alue
 */
const buildWhereClause = ({ field, operator, value }) => {
  if (_.isArray(value) && !['or', 'in', 'nin'].includes(operator)) {
    return {
      $or: value.map((val) =>
        buildWhereClause({ field, operator, value: val })
      ),
    }
  }

  const val = valueToId(value)

  switch (operator) {
    case 'or': {
      return {
        $or: value.map((orClause) => {
          if (_.isArray(orClause)) {
            return {
              $and: orClause.map(buildWhereClause),
            }
          }
          return buildWhereClause(orClause)
        }),
      }
    }
    case 'eq':
      return { [field]: val }
    case 'ne':
      return { [field]: { $ne: val } }
    case 'lt':
      return { [field]: { $lt: val } }
    case 'lte':
      return { [field]: { $lte: val } }
    case 'gt':
      return { [field]: { $gt: val } }
    case 'gte':
      return { [field]: { $gte: val } }
    case 'in':
      return {
        [field]: {
          $in: _.isArray(val) ? val : [val],
        },
      }
    case 'nin':
      return {
        [field]: {
          $nin: _.isArray(val) ? val : [val],
        },
      }
    case 'contains': {
      return {
        [field]: {
          $regex: _.escapeRegExp(`${val}`),
          $options: 'i',
        },
      }
    }
    case 'ncontains':
      return {
        [field]: {
          $not: new RegExp(val, 'i'),
        },
      }
    case 'containss':
      return {
        [field]: {
          $regex: _.escapeRegExp(`${val}`),
        },
      }
    case 'ncontainss':
      return {
        [field]: {
          $not: new RegExp(val),
        },
      }
    case 'null': {
      return value ? { [field]: { $eq: null } } : { [field]: { $ne: null } }
    }

    default:
      throw new Error(`Unhandled whereClause : ${field} ${operator} ${value}`)
  }
}

/**
 * Builds a simple find query when there are no deep filters
 * @param {Object} options - Query options
 * @param {Object} options.model - The model you are querying
 * @param {Object} options.filters - An object with the possible filters (start, limit, sort, where)
 * @param {Object} options.search - An object with the possible search params
 * @param {Object} options.populate - An array of paths to populate
 */
const buildSimpleQuery = ({ model, filters, populate }, { session }) => {
  let query = model.session(session).populate(populate)

  query = applyQueryParams({ model, query, filters })

  return Object.assign(query, {
    // Override count to use countDocuments on simple find query
    count(...args) {
      return query.countDocuments(...args)
    },
  })
}

/**
 * Add primaryKey on relation where clause for lookups match
 * @param {Object} model - Mongoose model
 * @param {Object} whereClause - Where clause
 * @param {string} whereClause.field - Where clause field
 * @param {string} whereClause.operator - Where clause operator
 * @param {*} whereClause.value - Where clause alue
 */
const formatWhereClause = (model, { field, operator, value }) => {
  if (BOOLEAN_OPERATORS.includes(operator)) {
    return {
      field,
      operator,
      value: value.map((v) =>
        v.map((whereClause) => formatWhereClause(model, whereClause))
      ),
    }
  }

  const { attribute, model: assocModel } = getAssociationFromFieldKey({
    model,
    field,
  })

  const shouldFieldBeSuffixed =
    attribute &&
    !_.endsWith(field, assocModel.primaryKey) &&
    (['in', 'nin'].includes(operator) || // When using in or nin operators we want to apply the filter on the relation's primary key and not the relation itself
      (['eq', 'ne'].includes(operator) && isMongoId(value))) // Only suffix the field if the operators are eq or ne and the value is a valid mongo id

  return {
    field: shouldFieldBeSuffixed ? `${field}.${assocModel.primaryKey}` : field,
    operator,
    value,
  }
}

/**
 * Match query for lookups
 * @param {Object} model - Mongoose model
 * @param {Object} filters - Filters object
 * @param {Array} search
 */
const buildQueryMatches = (model, filters, search = []) => {
  if (_.has(filters, 'where') && _.isArray(filters.where)) {
    const wheres = filters.where.map((whereClause) =>
      buildWhereClause(formatWhereClause(model, whereClause))
    )

    const criterias = combineSearchAndWhere(search, wheres)

    return [{ $match: criterias }]
  }

  return []
}

/**
 * Sort query for the aggregate
 * @param {Object} model - Mongoose model
 * @param {Object} filters - Filters object
 */
const buildQuerySort = (model, filters) => {
  const { sort } = filters

  if (_.isArray(sort) && !isEmpty(sort)) {
    return [
      {
        $sort: sort.reduce(
          (acc, { field, order }) => set([field], sortOrderMapper[order], acc),
          {}
        ),
      },
    ]
  }

  return []
}

/**
 * Add pagination operators for the aggregate
 * @param {Object} model - Mongoose model
 * @param {Object} filters - Filters object
 */
const buildQueryPagination = (model, filters) => {
  const { limit, start } = filters
  const pagination = []

  if (start && start >= 0) {
    pagination.push({ $skip: start })
  }

  if (limit && limit >= 0) {
    pagination.push({ $limit: limit })
  }

  return pagination
}

/**
 * Builds a deep aggregate query when there are deep filters
 * @param {Object} options - Query options
 * @param {Object} options.model - The model you are querying
 * @param {Object} options.filters - An object with the possible filters (start, limit, sort, where)
 * @param {Object} options.populate - An array of paths to populate
 */
const buildDeepQuery = ({ model, filters, search, populate }, { session }) => {
  // Init the query
  const query = model
    .session(session)
    .append(buildQueryMatches(model, filters, search))
    .append(buildQuerySort(model, filters))
    .append(buildQueryPagination(model, filters))

  return {
    /**
     * Overrides the promise to rehydrate mongoose docs after the aggregation query
     */
    then(...args) {
      return (
        query
          .append({ $project: { _id: true } })
          // eslint-disable-next-line no-underscore-dangle
          .then((results) => results.map((el) => el._id))
          .then((ids) => {
            if (ids.length === 0) return []
            const mongooseQuery = model
              .find({ _id: { $in: ids } }, null)
              .session(session)
              .populate(populate)
            return applyQueryParams({
              model,
              query: mongooseQuery,
              filters: omit(['sort', 'start', 'limit'], filters),
            }).then(
              orderByIndexMap(
                ids.reduce((acc, id, idx) => assoc(id, idx, acc), {})
              )
            )
          })
          .then(...args)
      )
    },
    catch(...args) {
      return this.then((r) => r).catch(...args)
    },
    /**
     * Maps to query.count
     */
    count() {
      return query
        .count('count')
        .then((results) => _.get(results, ['0', 'count'], 0))
    },

    /**
     * Maps to query group
     */
    group(...args) {
      return query.group(...args)
    },
    /**
     * Returns an array of plain JS object instead of mongoose documents
     */
    lean() {
      // Returns plain js objects without the transformations we normally do on find
      return this.then((results) =>
        results.map((r) => r.toObject({ transform: false }))
      )
    },
  }
}

/**
 * Build a mongo query
 * @param {Object} options - Query options
 * @param {Object} options.model - The model you are querying
 * @param {Object} options.filters - An object with the possible filters (start, limit, sort, where)
 * @param {Object} options.populate - An array of paths to populate
 * @param {boolean} options.aggregate - Force aggregate function to use group by feature
 */
module.exports = ({
  model,
  filters = {},
  searchParam,
  populate = [],
  aggregate = false,
  session = null,
} = {}) => {
  const search = buildSearchOr(model, searchParam)

  if (!hasDeepFilters(filters) && aggregate === false) {
    return buildSimpleQuery({ model, filters, search, populate }, { session })
  }

  return buildDeepQuery({ model, filters, populate, search }, { session })
}
