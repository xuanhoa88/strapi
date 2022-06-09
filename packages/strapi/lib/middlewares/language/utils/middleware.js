/**
 * Module dependencies.
 */

const debug = require('debug')('koa:i18n')
const { I18nProvider, SET_PREFIX } = require('./provider')

function registerMethods(helpers, i18n) {
  I18nProvider.resMethods.forEach((method) => {
    helpers[method] = i18n[method].bind(i18n)
  })
}

// Internationalization and Localization
module.exports = function ial(app, i18n) {
  /**
   * Lazily creates an i18n.
   *
   * @api public
   */
  Object.defineProperty(app.context, 'i18n', {
    get() {
      if (this._i18n) {
        return this._i18n
      }

      i18n.request = this.request
      this._i18n = i18n

      // merge into ctx.state
      this.state.i18n = i18n
      registerMethods(this.state, i18n)

      debug('app.ctx.i18n %j', i18n)
      return i18n
    },
  })

  Object.defineProperty(app.request, 'i18n', {
    get() {
      return this.ctx.i18n
    },
  })

  return function i18nMiddleware(ctx, next) {
    ctx.i18n.whitelist.some((key) => {
      const customLocaleMethod =
        typeof key === 'function' && ctx.i18n.setLocale(key.apply(ctx))
      if (customLocaleMethod || ctx.i18n[SET_PREFIX + key]()) return true
    })
    return next()
  }
}
