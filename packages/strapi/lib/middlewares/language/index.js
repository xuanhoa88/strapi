/**
 * Module dependencies
 */

// Node.js core.
const { resolve } = require("path")
const locale = require("koa-locale")
const middleware = require("./utils/middleware")
const { I18nProvider } = require("./utils/provider")

/**
 * Language hook
 */

module.exports = (strapi) => ({
  /**
   * Initialize the hook
   */

  initialize() {
    locale(strapi.app)

    const { defaultLocale, modes, cookieName } =
      strapi.config.middleware.settings.language

    const directory = resolve(
      strapi.config.appPath,
      strapi.config.paths.config,
      "locales"
    )

    strapi.i18n = new I18nProvider({
      directory,
      locales: strapi.config.get("middleware.settings.language.locales", []),
      defaultLocale,
      modes,
      cookieName,
      extension: ".json",
    })

    strapi.app.use(middleware(strapi.app, strapi.i18n))
  },
})
