const _ = require('lodash')
const pluralize = require('pluralize')

const ID_ATTRIBUTE = 'id'

const getTimestamps = (model) => {
  const timestamps = _.get(model, 'options.timestamps', [])

  if (!_.isArray(timestamps)) {
    return []
  }

  return timestamps
}

const getNonWritableAttributes = (model = {}) => {
  const nonWritableAttributes = _.reduce(
    model.attributes,
    (acc, attr, attrName) =>
      attr.writable === false ? acc.concat(attrName) : acc,
    []
  )

  return _.uniq([
    ID_ATTRIBUTE,
    model.primaryKey,
    ...getTimestamps(model),
    ...nonWritableAttributes,
  ])
}

const getNonVisibleAttributes = (model) => {
  const nonVisibleAttributes = _.reduce(
    model.attributes,
    (acc, attr, attrName) =>
      attr.visible === false ? acc.concat(attrName) : acc,
    []
  )

  return _.uniq([
    ID_ATTRIBUTE,
    model.primaryKey,
    ...getTimestamps(model),
    ...nonVisibleAttributes,
  ])
}

const getVisibleAttributes = (model) =>
  _.difference(_.keys(model.attributes), getNonVisibleAttributes(model))

const isVisibleAttribute = (model, attributeName) =>
  getVisibleAttributes(model).includes(attributeName)

const isPrivateAttribute = (model, attributeName) =>
  model &&
  model.privateAttributes &&
  model.privateAttributes.includes(attributeName)

const createContentType = (
  model,
  modelName,
  componentName,
  isPlugin = false
) => {
  const prefix = isPlugin ? 'plugin' : 'api'
  Object.assign(model, {
    uid: `${prefix}::${componentName}.${modelName}`,
    collectionName:
      model.collectionName ||
      _.snakeCase(`${componentName}_${pluralize(modelName)}`),
    globalId: model.globalId || `${prefix}::${componentName}_${modelName}`,
    attributes: {},
  })
}

module.exports = {
  isPrivateAttribute,
  getNonWritableAttributes,
  getNonVisibleAttributes,
  getVisibleAttributes,
  isVisibleAttribute,
  createContentType,
}
