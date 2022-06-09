/**
 * Use `server.js` to run your application without `$ strapi start`.
 * To start the server, run: `$ npm start`.
 *
 * This is handy in situations where the Strapi CLI is not relevant or useful.
 */

// Strapi.
const strapi = require('./packages/strapi/lib/Strapi')

process.on('unhandledRejection', (reason, p) => {
  console.log(reason, 'Unhandled Rejection at Promise', p)
})

process.on('uncaughtException', (err) => {
  console.log(err, 'Uncaught Exception thrown')
})

process.chdir(__dirname)

module.exports = (options) => {
  const strapiInstance = strapi(options)
  strapiInstance.start()

  return strapiInstance
}
