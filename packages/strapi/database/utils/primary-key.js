const _ = require('lodash')

/**
 * If exists, rename the key "id" by the primary key name of the model ("_id" by default for mongoose).
 */
const replaceIdByPrimaryKey = (params, model) => {
  const newParams = { ...params }
  if (_.has(params, 'id')) {
    delete newParams.id
    newParams[model.primaryKey] = params[model.primaryKey] || params.id
  }

  if (_.has(params, '_id')) {
    // eslint-disable-next-line no-underscore-dangle
    delete newParams._id
    // eslint-disable-next-line no-underscore-dangle
    newParams[model.primaryKey] = params[model.primaryKey] || params._id
  }

  return newParams
}

module.exports = {
  replaceIdByPrimaryKey,
}
