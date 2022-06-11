const _ = require('lodash')
const {
  extendWithPopulateQueries,
  queryOptionsToQueryMap,
} = require('./utils/populate-queries')

function getFnName(fn) {
  if (!_.isFunction(fn)) {
    return null
  }
  fn = Object(fn)
  const N = fn.name
  const S = (N && ['', N]) || fn.toString().match(/function(?<=(\s|^))([^(]+)/)
  return (S && S[1]) || 'anonymous'
}

const formatPopulateOptions = (db, { withRelated, ...queryOptions } = {}) => {
  if (!_.isArray(withRelated)) withRelated = [withRelated]

  const relations = _.reduce(
    withRelated,
    (collection, key) => {
      if (_.isString(key)) {
        collection[key] = _.noop
        Object.defineProperty(collection[key], 'name', { value: key })
        return collection
      }

      const fnName = getFnName(key)
      if (fnName && fnName !== 'anonymous') {
        collection[fnName] = key
        return collection
      }

      return collection
    },
    {}
  )

  return _.keys(relations).reduce((collection, key) => {
    // check the key path and update it if necessary
    const parts = _.split(key, '.')
    let newKey
    let prefix = ''
    for (const part of parts) {
      const targetModel = db.models.get(part)
      if (!targetModel) return collection

      newKey = `${prefix}${part}`
      prefix = `${newKey}.`

      _.extend(collection, {
        [newKey]: extendWithPopulateQueries(
          [relations[newKey], collection[newKey]],
          queryOptionsToQueryMap(queryOptions, { model: targetModel })
        ),
      })
    }

    return collection
  }, {})
}

/**
 * Create utilities to populate a model on fetch
 */
module.exports = (db, options) => {
  // do not populate anything
  if (options.withRelated === false) return
  if (options.isEager === true) return

  options.withRelated = [formatPopulateOptions(db, options)]
}
