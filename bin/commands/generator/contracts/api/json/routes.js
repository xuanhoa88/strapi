/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs')

// Public node modules.
const _ = require('lodash')

function generateRoutes(name) {
  return [
    {
      method: 'GET',
      path: '/',
      handler: `${name}.find`,
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/:id',
      handler: `${name}.findOne`,
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/',
      handler: `${name}.create`,
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/:id',
      handler: `${name}.update`,
      config: {
        policies: [],
      },
    },
    {
      method: 'DELETE',
      path: '/:id',
      handler: `${name}.delete`,
      config: {
        policies: [],
      },
    },
  ]
}

/**
 * Expose main routes of the generated API
 */

module.exports = (scope) => {
  let routes = []
  if (!scope.args.plugin) {
    routes = generateRoutes(scope.name)
  }

  // if routes.json already exists, then merge
  if (fs.existsSync(scope.rootPath)) {
    const current = require(scope.rootPath)
    fs.unlinkSync(scope.rootPath)
    routes = _.concat(
      routes,
      _.differenceWith(current.routes, routes, _.isEqual)
    )
  }

  return { prefix: `/${scope.route}`, routes }
}
