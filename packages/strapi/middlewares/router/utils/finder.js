/**
 * Module dependencies
 */

const _ = require('lodash')

/**
 * Find controller's location
 */

module.exports = (api, controller) => {
  if (!_.isObject(api)) {
    throw new Error('Should be an object')
  }

  if (_.isObject(controller) && _.has(controller, 'uid')) {
    controller = _.toLower(controller.uid)
  } else if (_.isString(controller)) {
    controller = _.toLower(controller)
  } else {
    throw new Error('Should be an object or a string')
  }

  const where = _.findKey(api, (o) => _.get(o, `controllers.${controller}`))

  // Return the API's name where the controller is located
  return where
}
