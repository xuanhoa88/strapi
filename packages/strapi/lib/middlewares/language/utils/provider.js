const debug = require("debug")("koa:i18n")
const I18n2 = require("i18n-2")
const _ = require("lodash")

const LOCALE_METHODS = ["Subdomain", "Cookie", "Header", "Query", "Url", "TLD"]
const SET_PREFIX = "setLocaleFrom"
const GET_PREFIX = "getLocaleFrom"

class I18nProvider extends I18n2 {
  constructor(opts) {
    super(opts)
    const modes = opts.modes || []
    const whitelist = (this.whitelist = [])
    modes.forEach((v) => {
      if (typeof v !== "function") {
        v = LOCALE_METHODS.filter((t) => t.toLowerCase() === v.toLowerCase())[0]
      }
      if (v) whitelist.push(v)
    })
  }
}

function getLocale(locale) {
  return _.toLower(locale || "")
}

function filter(locale, locales) {
  for (const k in locales) {
    if (locale === k.toLowerCase()) {
      return k
    }
  }
}

LOCALE_METHODS.forEach((m) => {
  Object.defineProperty(I18nProvider.prototype, SET_PREFIX + m, {
    value() {
      let locale = getLocale(this.request[GET_PREFIX + m]())
      if (locale === this.getLocale()) return true
      if ((locale = filter(locale, this.locales))) {
        this.setLocale(locale)
        debug("Overriding locale from %s : %s", m.toLowerCase(), locale)
        return true
      }
    },
  })
})

module.exports = {
  SET_PREFIX,
  I18nProvider,
}
