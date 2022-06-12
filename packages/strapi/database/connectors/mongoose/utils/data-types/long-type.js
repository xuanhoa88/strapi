const util = require('util')
const _ = require('lodash')

module.exports = (mongoose) => {
  const { Schema } = mongoose
  const { SchemaType } = mongoose
  const { Types } = mongoose
  const { mongo } = mongoose

  /**
   * Long constructor
   *
   * @inherits SchemaType
   * @param {String} key
   * @param {Object} [options]
   */

  function Long(key, options) {
    SchemaType.call(this, key, options)
  }

  /*!
   * inherits
   */
  util.inherits(Long, mongoose.SchemaTypes.Number)

  /**
   * Implement checkRequired method.
   *
   * @param {any} val
   * @return {Boolean}
   */

  Long.prototype.checkRequired = function checkRequired(val) {
    return val != null
  }

  /**
   * Implement casting.
   *
   * @param {any} val
   * @param {Object} [scope]
   * @param {Boolean} [init]
   * @return {mongo.Long|null}
   */

  Long.prototype.cast = function cast(val) {
    if (val === null) return val
    if (val === '') return null

    if (val instanceof mongo.Long) {
      return val
    }

    if (val instanceof Number || typeof val === 'number') {
      return mongo.Long.fromNumber(val)
    }

    if (!_.isArray(val) && val.toString) {
      return mongo.Long.fromString(val.toString())
    }

    throw new SchemaType.CastError('Long', val, this.path)
  }

  /*!
   * ignore
   */

  function handleSingle(val) {
    return this.cast(val)
  }

  function handleArray(val) {
    const self = this
    return val.map((m) => self.cast(m))
  }

  Long.prototype.$conditionalHandlers.$lt = handleSingle
  Long.prototype.$conditionalHandlers.$lte = handleSingle
  Long.prototype.$conditionalHandlers.$gt = handleSingle
  Long.prototype.$conditionalHandlers.$gte = handleSingle
  Long.prototype.$conditionalHandlers.$ne = handleSingle
  Long.prototype.$conditionalHandlers.$in = handleArray
  Long.prototype.$conditionalHandlers.$nin = handleArray
  Long.prototype.$conditionalHandlers.$mod = handleArray
  Long.prototype.$conditionalHandlers.$all = handleArray
  Long.prototype.$conditionalHandlers.$bitsAnySet = handleArray
  Long.prototype.$conditionalHandlers.$bitsAllSet = handleArray

  /**
   * Implement query casting, for mongoose 3.0
   *
   * @param {String} $conditional
   * @param {*} [value]
   */

  Long.prototype.castForQuery = function castForQuery($conditional, value) {
    let handler
    if (arguments.length === 2) {
      handler = this.$conditionalHandlers[$conditional]
      if (!handler) {
        throw new Error(`Can't use ${$conditional} with Long.`)
      }
      return handler.call(this, value)
    }
    return this.cast($conditional)
  }

  /**
   * Expose
   */

  Schema.Types.Long = Long
  Types.Long = mongo.Long

  return mongoose
}
