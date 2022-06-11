const VError = require('verror')
const resolveCwd = require('resolve-cwd')

/**
 * Requires a database connector
 * @param {string} connector connector name
 * @param {DatabaseManager} databaseManager reference to the database manager
 */
module.exports = (db, { connector, connection, components }) => {
  if (!connector) {
    throw new VError(
      { name: 'ConnectorError' },
      'initialize connector without name'
    )
  }

  let connectorPath
  try {
    connectorPath = resolveCwd.silent(`strapi-connector-${connector}`)
    if (!connectorPath) {
      connectorPath = resolveCwd(`${__dirname}/connectors/${connector}`)
    }
  } catch (error) {
    throw new VError(
      { name: 'ConnectorError', cause: error },
      'connector "%s" not found',
      connector
    )
  }

  try {
    return require(connectorPath)(db, {
      connection,
      connector,
      components,
    })
  } catch (error) {
    throw new VError(
      { name: 'ConnectorError', cause: error },
      'initialize connector "%s"',
      connector
    )
  }
}
