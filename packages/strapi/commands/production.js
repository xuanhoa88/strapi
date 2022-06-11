const strapi = require('../Strapi')

/**
 * `$ strapi start`
 */
module.exports = async () => {
  const strapiInstance = strapi()
  await strapiInstance.start()

  return strapiInstance
}
