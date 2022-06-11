/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */

module.exports = {
  collectionName: 'user',
  connection: 'bookshelf',
  userlogins() {
    return this.hasMany('userlogin')
  },
}
