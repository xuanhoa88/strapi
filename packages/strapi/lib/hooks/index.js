const {
  uniq,
  difference,
  get,
  merge,
  isFunction,
  isNil,
  keys,
} = require("lodash")

module.exports = async (strapi) => {
  const { hook: hookConfig } = strapi.config

  // check if a hook exists
  const hookExists = (key) => !isNil(strapi.hook[key])

  // check if a hook is enabled
  const hookEnabled = (key) =>
    get(hookConfig, ["settings", key, "enabled"], false) === true

  // list of enabled hooks
  const enableddHook = keys(strapi.hook).filter(hookEnabled)

  // Method to initialize hooks and emit an event.
  const initialize = (hookKey) => {
    if (strapi.hook[hookKey].loaded === true) return

    const { load } = strapi.hook[hookKey]
    const hookTimeout = get(
      hookConfig,
      ["settings", hookKey, "timeout"],
      hookConfig.timeout
    )

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(`(hook: ${hookKey}) is taking too long to load.`),
        hookTimeout || 1000
      )

      strapi.hook[hookKey] = merge(strapi.hook[hookKey], load)

      const onFinish = (err) => {
        if (err) {
          strapi.app.emit(`hook:${hookKey}:error`)
          return reject(err)
        }

        strapi.hook[hookKey].loaded = true

        strapi.app.emit(`hook:${hookKey}:loaded`)

        // Remove listeners.
        strapi.app.removeAllListeners(`hook:${hookKey}:loaded`)

        resolve()
      }

      Promise.resolve()
        .then(() => load.initialize(onFinish))
        .then(() => {
          clearTimeout(timeout)
          strapi.hook[hookKey].loaded = true
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

  // Run beforeInitialize of every hook
  await Promise.all(
    enableddHook.map((key) => {
      const { beforeInitialize } = strapi.hook[key].load
      if (isFunction(beforeInitialize)) {
        return beforeInitialize()
      }
      return Promise.resolve()
    })
  )

  // run the initialization of an array of hooks sequentially
  const initdHookSeq = async (hooks) => {
    await Promise.all(uniq(hooks).map((key) => initialize(key)))
  }

  const hooksBefore = get(hookConfig, "load.before", [])
    .filter(hookExists)
    .filter(hookEnabled)

  const hooksAfter = get(hookConfig, "load.after", [])
    .filter(hookExists)
    .filter(hookEnabled)

  const hooksOrder = get(hookConfig, "load.order", [])
    .filter(hookExists)
    .filter(hookEnabled)

  const unspecifieddHook = difference(
    enableddHook,
    hooksBefore,
    hooksOrder,
    hooksAfter
  )

  // before
  await initdHookSeq(hooksBefore)

  // ordered // rest of hooks
  await initdHookSeq(hooksOrder)
  await initdHookSeq(unspecifieddHook)

  // after
  await initdHookSeq(hooksAfter)
}
