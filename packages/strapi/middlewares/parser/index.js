const body = require('koa-body')
const qs = require('qs')
const { omit } = require('lodash')

/**
 * Body parser hook
 */
const addQsParser = (app, settings) => {
  Object.defineProperty(app.request, 'query', {
    configurable: false,
    enumerable: true,
    /*
     * Get parsed query-string.
     */
    get() {
      const qstr = this.querystring
      const cache = this._querycache || {}
      return cache[qstr] || (cache[qstr] = qs.parse(qstr, settings))
    },

    /*
     * Set query-string as an object.
     */
    set(obj) {
      this.querystring = qs.stringify(obj)
    },
  })

  return app
}

module.exports = (strapi) => ({
  /**
   * Initialize the hook
   */
  initialize() {
    strapi.app.use(async (ctx, next) => {
      try {
        return await body({
          patchKoa: true,
          ...omit(
            strapi.config.middleware.settings.parser,
            'queryStringParser'
          ),
        })(ctx, next)
      } catch (e) {
        if ((e || {}).message && e.message.includes('maxFileSize exceeded')) {
          throw strapi.errors.entityTooLarge('FileTooBig', {
            errors: [
              {
                id: 'Upload.status.sizeLimit',
                message: `file is bigger than the limit size!`,
              },
            ],
          })
        }
        throw e
      }
    })

    addQsParser(
      strapi.app,
      strapi.config.get('middleware.settings.parser.queryStringParser')
    )
  },
})
