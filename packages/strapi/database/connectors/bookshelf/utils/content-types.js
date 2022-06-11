const _ = require('lodash')

const DP_PUB_STATE_LIVE = 'live'
const DP_PUB_STATE_PREVIEW = 'preview'
const PUBLISHED_AT_ATTRIBUTE = 'published_at'
const CREATED_BY_ATTRIBUTE = 'created_by'
const UPDATED_BY_ATTRIBUTE = 'updated_by'

const DP_PUB_STATES = [DP_PUB_STATE_LIVE, DP_PUB_STATE_PREVIEW]

const constants = {
  DP_PUB_STATES,
  PUBLISHED_AT_ATTRIBUTE,
  CREATED_BY_ATTRIBUTE,
  UPDATED_BY_ATTRIBUTE,
  DP_PUB_STATE_LIVE,
  DP_PUB_STATE_PREVIEW,
}

const hasDraftAndPublish = (model) =>
  _.get(model, 'options.draftAndPublish', false) === true

const getPrivateAttributes = (model = {}) =>
  _.union(
    _.get(model, 'options.privateAttributes', []),
    _.keys(_.pickBy(model.attributes, (attr) => !!attr.private))
  )

const isDraft = (data, model) =>
  hasDraftAndPublish(model) && _.get(data, PUBLISHED_AT_ATTRIBUTE) === null

module.exports = {
  constants,
  hasDraftAndPublish,
  getPrivateAttributes,
  isDraft,
}
