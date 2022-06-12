const util = require('util')
const _ = require('lodash')

module.exports = (mongoose) => {
  const { Schema } = mongoose
  const { Types } = mongoose
  const { mongo } = mongoose
  const { CastError } = mongoose.SchemaType

  function Float(path, options) {
    this.path = path
    mongoose.SchemaTypes.Number.call(this, path, options)
  }

  /*!
   * inherits
   */
  util.inherits(Float, mongoose.SchemaTypes.Number)

  /**
   * Implement checkRequired method.
   *
   * @param {any} val
   * @return {Boolean}
   */

  Float.checkRequired = (value) =>
    typeof value === 'number' || value instanceof Number

  /**
   * Implement casting.
   *
   * @param {any} val
   * @param {Object} [scope]
   * @param {Boolean} [init]
   * @return {mongo.Long|null}
   */
  Float.prototype.cast = function cast(value) {
    if (value == null || value === '') {
      return value
    }

    if (typeof value === 'string' || typeof value === 'boolean') {
      value = Number(value)
    }

    if (_.isNaN(value)) return new CastError('Number', value, this.path)

    return Number(value.toFixed(2))
  }

  /**
   * Expose
   */

  Schema.Types.Float = Float
  Types.Float = mongo.Float

  return Float
}
