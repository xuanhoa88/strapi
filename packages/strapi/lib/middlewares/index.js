const {
  uniq,
  difference,
  get,
  merge,
  isFunction,
  keys,
  includes,
  isNil,
} = require("lodash")

const requiredMiddlewares = [
  "responses",
  "router",
  "logger",
  "boom",
  "cors",
  "cron",
  "xframe",
  "xss",
]

module.exports = async (strapi) => {
  /** Utils */
  const middlewareConfig = strapi.config.middleware

  // check if a middleware exists
  const middlewareExists = (key) => !isNil(strapi.middleware[key])

  // check if a middleware is enabled
  const middlewareEnabled = (key) =>
    includes(requiredMiddlewares, key) ||
    get(middlewareConfig, ["settings", key, "enabled"], false) === true

  // list of enabled middlewares
  const enabledMiddlewares = keys(strapi.middleware).filter(middlewareEnabled)

  // Method to initialize middlewares and emit an event.
  const initialize = (middlewareKey) => {
    if (strapi.middleware[middlewareKey].loaded === true) return

    const middleware = strapi.middleware[middlewareKey].load

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () =>
          reject(`(middleware: ${middlewareKey}) is taking too long to load.`),
        middlewareConfig.timeout || 1000
      )

      strapi.middleware[middlewareKey] = merge(
        strapi.middleware[middlewareKey],
        middleware
      )

      Promise.resolve()
        .then(() => middleware.initialize())
        .then(() => {
          clearTimeout(timeout)
          strapi.middleware[middlewareKey].loaded = true
          resolve()
        })
        .catch((err) => {
          clearTimeout(timeout)

          if (err) {
            return reject(err)
          }
        })
    })
  }

  /**
   * Run init functions
   */

  // Run beforeInitialize of every middleware
  await Promise.all(
    enabledMiddlewares.map((key) => {
      const { beforeInitialize } = strapi.middleware[key].load
      if (isFunction(beforeInitialize)) {
        return beforeInitialize()
      }
      return Promise.resolve()
    })
  )

  // run the initialization of an array of middlewares sequentially
  const initMiddlewaresSeq = async (middlewares) => {
    await Promise.all(uniq(middlewares).map((key) => initialize(key)))
  }

  const middlewaresBefore = get(middlewareConfig, "load.before", [])
    .filter(middlewareExists)
    .filter(middlewareEnabled)

  const middlewaresAfter = get(middlewareConfig, "load.after", [])
    .filter(middlewareExists)
    .filter(middlewareEnabled)

  const middlewaresOrder = get(middlewareConfig, "load.order", [])
    .filter(middlewareExists)
    .filter(middlewareEnabled)

  const unspecifiedMiddlewares = difference(
    enabledMiddlewares,
    middlewaresBefore,
    middlewaresOrder,
    middlewaresAfter
  )

  // before
  await initMiddlewaresSeq(middlewaresBefore)

  // ordered // rest of middlewares
  await Promise.all([
    initMiddlewaresSeq(middlewaresOrder),
    Promise.all(unspecifiedMiddlewares.map(initialize)),
  ])

  // after
  await initMiddlewaresSeq(middlewaresAfter)
}
