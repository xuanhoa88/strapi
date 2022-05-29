const assert = require("assert")
const _ = require("lodash")

module.exports = (initialConfig = {}) => {
  assert(
    typeof initialConfig === "object" && initialConfig !== null,
    "Initial config must be an object"
  )

  const config = _.cloneDeep(initialConfig)

  return Object.assign(config, {
    get(path, defaultValue) {
      return _.get(config, path, defaultValue)
    },

    set(path, val) {
      _.set(config, path, val)
      return this
    },

    has(path) {
      return _.has(config, path)
    },
  })
}
