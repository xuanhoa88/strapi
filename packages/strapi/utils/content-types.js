const _ = require('lodash')

const SINGLE_TYPE = 'singleType'
const COLLECTION_TYPE = 'collectionType'

const ID_ATTRIBUTE = 'id'
const PUBLISHED_AT_ATTRIBUTE = 'published_at'
const CREATED_BY_ATTRIBUTE = 'created_by'
const UPDATED_BY_ATTRIBUTE = 'updated_by'
const DP_PUB_STATE_LIVE = 'live'
const DP_PUB_STATE_PREVIEW = 'preview'
const DP_PUB_STATES = [DP_PUB_STATE_LIVE, DP_PUB_STATE_PREVIEW]

const constants = {
  ID_ATTRIBUTE,
  PUBLISHED_AT_ATTRIBUTE,
  CREATED_BY_ATTRIBUTE,
  UPDATED_BY_ATTRIBUTE,
  DP_PUB_STATES,
  DP_PUB_STATE_LIVE,
  DP_PUB_STATE_PREVIEW,
  SINGLE_TYPE,
  COLLECTION_TYPE,
}

const getGlobalId = (model, modelName, prefix) => {
  const globalId = prefix ? `${prefix}-${modelName}` : modelName
  return model.globalId || _.upperFirst(_.camelCase(globalId))
}

const createContentType = (
  model,
  { modelName },
  { apiName, pluginName } = {}
) => {
  if (apiName) {
    Object.assign(model, {
      uid: `api::${apiName}.${modelName}`,
      apiName,
      collectionName:
        model.collectionName || `${apiName}_${modelName}`.toLowerCase(),
      globalId: getGlobalId(model, modelName, apiName),
    })
  } else if (pluginName) {
    Object.assign(model, {
      uid: `plugins::${pluginName}.${modelName}`,
      plugin: pluginName,
      collectionName:
        model.collectionName || `${pluginName}_${modelName}`.toLowerCase(),
      globalId: getGlobalId(model, modelName, pluginName),
    })
  }
}

module.exports = {
  constants,
  createContentType,
  getGlobalId,
}
