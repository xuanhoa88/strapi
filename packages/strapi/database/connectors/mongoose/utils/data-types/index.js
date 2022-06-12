const LongType = require('./long-type')
const FloatType = require('./float-type')

module.exports = (mongoose) => {
  LongType(mongoose)
  FloatType(mongoose)

  /**
   * Convert MongoDB ID to the stringify version as GraphQL throws an error if not.
   *
   * Refer to: https://github.com/graphql/graphql-js/commit/3521e1429eec7eabeee4da65c93306b51308727b#diff-87c5e74dd1f7d923143e0eee611f598eR183
   */
  mongoose.Types.ObjectId.prototype.valueOf = function valueOf() {
    return this.toString()
  }

  return mongoose
}
