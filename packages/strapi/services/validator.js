/**
 * Entity validator
 * Module that will validate input data for entity creation or edition
 */
const _ = require('lodash')
const Joi = require('joi')

function formatValidationError({ details }) {
  return _.flatten(
    _.map(details, (detail) => {
      const path = detail.path.length === 0 ? '' : detail.path
      const separator = detail.path.length === 0 ? '' : '.'
      return { type: detail.type, path, separator, message: detail.message }
    })
  ).reduce((usefulErrors, error) => {
    usefulErrors[error.path.join('_')] = {
      type: error.type,
      message: `error.${error.path.join('_')}.${error.type}`,
      raw_message: error.message,
    }
    return usefulErrors
  }, {})
}

module.exports = (strapi) => ({
  /**
   * @param {Function} validator
   * @param {Object} data input data
   */
  async validateEntity(validator, data) {
    return validator(Joi, strapi)
      .validateAsync(data, {
        abortEarly: false,
        allowUnknown: true,
      })
      .catch((error) => {
        throw strapi.errors.badRequest('ValidationError', {
          errors: formatValidationError(error),
        })
      })
  },
})
