module.exports = (prefix, pkgJSON) =>
  Object.keys(pkgJSON.dependencies)
    .filter((d) => d.startsWith(prefix) && d.length > prefix.length)
    .map((pkgName) => pkgName.substring(prefix.length + 1))
