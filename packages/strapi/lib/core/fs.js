const path = require("path")
const fs = require("fs")

/**
 * create strapi fs layer
 */
module.exports = (strapi) => {
  function normalizePath(optPath) {
    const filePath = Array.isArray(optPath) ? optPath.join("/") : optPath

    return path.join(
      strapi.dir,
      path.normalize(filePath).replace(/^(\/?\.\.?)+/, "")
    )
  }

  const strapiFS = {
    /**
     * Writes a file in a strapi app
     * @param {Array|string} optPath - file path
     * @param {string} data - content
     */
    writeAppFile(optPath, data) {
      const writePath = normalizePath(optPath)
      return fs.ensureFile(writePath).then(() => fs.writeFile(writePath, data))
    },

    /**
     * Writes a file in a plugin extensions folder
     * @param {string} plugin - plugin name
     * @param {Array|string} optPath - path to file
     * @param {string} data - content
     */
    writePluginFile(plugin, optPath, data) {
      const newPath = ["extensions", plugin].concat(optPath).join("/")
      return strapiFS.writeAppFile(newPath, data)
    },

    /**
     * Removes a file in strapi app
     */
    removeAppFile(optPath) {
      const removePath = normalizePath(optPath)
      return fs.remove(removePath)
    },
  }

  return strapiFS
}
