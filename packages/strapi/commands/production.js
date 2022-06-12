const strapi = require('../Strapi')
const rc = require('../utils/rc')

/**
 * `$ strapi start`
 */
module.exports = async ({ iniFile }) => {
  let strapiOptions = {}
  if (iniFile) {
    strapiOptions = rc(iniFile)
  }

  const strapiInstance = strapi(strapiOptions)
  await strapiInstance.start()

  return strapiInstance
}
