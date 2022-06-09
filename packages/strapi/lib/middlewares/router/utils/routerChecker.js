/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash')

// Strapi utilities.
const policyUtils = require('./policy')
const finder = require('./finder')

const getMethod = (route) => _.trim(_.toLower(route.method))
const getEndpoint = (route) => _.trim(route.path)

module.exports = (strapi) =>
  function routerChecker(value, type, name) {
    const method = getMethod(value)
    const endpoint = getEndpoint(value)

    // Define controller and action names.
    const [controllerName, actionName] = _.trim(value.handler).split('.')
    const controllerKey = _.toLower(controllerName)

    const isPlugin = type === 'plugin'

    let controller
    if (isPlugin) {
      controller = _.get(strapi.plugins[name], ['controllers', controllerKey])
    } else {
      controller = _.get(strapi.api[controllerKey], [
        'controllers',
        controllerKey,
      ])
    }

    if (!controller || !_.isFunction(controller[actionName])) {
      strapi.stopWithError(
        `Error creating endpoint ${method} ${endpoint}: handler not found "${controllerKey}.${actionName}"`
      )
    }

    const action = controller[actionName].bind(controller)

    // Retrieve the API's name where the controller is located
    // to access to the right validators
    const currentModule = finder(
      isPlugin ? strapi.plugins[name] : strapi.api[name],
      controller
    )

    // Add the `globalPolicy`.
    const globalPolicy = policyUtils.globalPolicy({
      controller: controllerKey,
      action: actionName,
      plugin: isPlugin ? name : null,
      method,
      endpoint,
    })

    // Init policies array.
    const policies = [globalPolicy]

    let policyOption = _.get(value, 'config.policies')

    // Allow string instead of array of policies.
    if (_.isString(policyOption) && !_.isEmpty(policyOption)) {
      policyOption = [policyOption]
    }

    if (_.isArray(policyOption) && name) {
      policyOption.forEach((policyName) => {
        try {
          policies.push(policyUtils.get(policyName, name, currentModule))
        } catch (error) {
          strapi.stopWithError(
            `Error creating endpoint ${method} ${endpoint}: ${error.message}`
          )
        }
      })
    }

    policies.push(async (ctx, next) => {
      // Set body.
      const values = await next()

      if (_.isNil(ctx.body) && !_.isNil(values)) {
        ctx.body = values
      }
    })

    return {
      method,
      endpoint,
      policies,
      action,
    }
  }
