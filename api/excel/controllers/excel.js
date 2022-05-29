/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async find(ctx) {
    ctx.body = {
      success: true,
    }
  },
  async create(ctx) {
    try {
      ctx.body = await strapi.services.excel.createFromTemplate(
        ctx.request.body
      )
    } catch (err) {
      ctx.badRequest()
    }
  },
  async download(ctx) {
    try {
      const { stream, displayName } = await strapi.services.excel.downloadFile(
        ctx.query.fileName
      )
      ctx.body = stream

      ctx.attachment(displayName)
    } catch (err) {
      ctx.badRequest()
    }
  },
}
