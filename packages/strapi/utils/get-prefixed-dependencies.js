const _ = require('lodash')

module.exports = (prefix, pkgJSON) =>
  _.keys(pkgJSON.dependencies)
    .filter((d) => d.startsWith(prefix) && d.length > prefix.length)
    .map((pkgName) => pkgName.substring(prefix.length + 1))
