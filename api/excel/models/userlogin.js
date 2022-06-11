/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */

module.exports = {
  collectionName: 'userlogin',
  connection: 'bookshelf',
  user() {
    return this.belongsTo('user', 'user')
  },
}
