const _ = require('lodash')
const debug = require('debug')('strapi-database:bookshelf')
const { createParser } = require('./parser')
const { createFormatter } = require('./formatter')
const populateFetch = require('./populate')

const getDatabaseName = ({ connection }) => {
  const dbName = _.get(connection, 'database')
  const dbSchema = _.get(connection, 'schema', 'public')
  switch (_.get(connection, 'client')) {
    case 'sqlite3':
      return 'main'
    case 'pg':
      return `${dbName}.${dbSchema}`
    case 'mysql':
      return dbName
    default:
      return dbName
  }
}

module.exports = async (
  { models, target },
  { db, GLOBALS, connection, ORM }
) => {
  // Parse every authenticated model.
  const updateModel = async (definition, model) => {
    // Add some information about ORM & client connection & tableName
    definition.orm = 'bookshelf'
    definition.databaseName = getDatabaseName(connection)
    definition.client = _.get(connection, 'client')
    definition.primaryKey = _.get(definition, 'idAttribute', 'id')
    definition.primaryKeyType = _.get(definition, 'idAttributeType', 'integer')

    // Register the final model for Bookshelf.
    const loadedModel = _.assign(
      {
        requireFetch: false,
        tableName: definition.collectionName,
        hasTimestamps: !!definition.hasTimestamps,
        defaults: _.keys(definition.attributes).reduce((acc, current) => {
          if (
            definition.attributes[current].type &&
            definition.attributes[current].default
          ) {
            acc[current] = definition.attributes[current].default
          }

          return acc
        }, {}),
        lifecycles: {},
      },
      definition
    )

    try {
      const parseValue = createParser()

      // External function to map key that has been updated with `columnName`
      const mapper = (params = {}) => {
        _.keys(params).forEach((key) => {
          const attr = definition.attributes[key] || {}
          params[key] = parseValue(attr.type, params[key])
        })

        return _.mapKeys(params, (value, key) => {
          const attr = definition.attributes[key] || {}
          return _.isPlainObject(attr) && _.isString(attr.columnName)
            ? attr.columnName
            : key
        })
      }

      // Initialize lifecycle callbacks.
      loadedModel.initialize = function initialize(...args) {
        // Load bookshelf plugin arguments from model options
        this.constructor.__super__.initialize.apply(this, args)

        this.on('fetching fetching:collection', (instance, attrs, options) => {
          populateFetch(db, options)
        })

        this.on('saving', (instance, attrs) => {
          instance.attributes = _.assign(instance.attributes, mapper(attrs))
        })

        const formatValue = createFormatter(definition.client)
        function formatEntry(entry) {
          _.keys(entry.attributes).forEach((key) => {
            const attr = definition.attributes[key] || {}
            entry.attributes[key] = formatValue(attr, entry.attributes[key])
          })
        }

        this.on('saved fetched fetched:collection', (instance) => {
          if (_.isArray(instance.models)) {
            instance.models.forEach(formatEntry)
          } else {
            formatEntry(instance)
          }
        })

        _.forEach(
          {
            creating: 'beforeCreate',
            created: 'afterCreate',
            destroying: 'beforeDestroy',
            destroyed: 'afterDestroy',
            updating: 'beforeUpdate',
            updated: 'afterUpdate',
            fetching: 'beforeFetch',
            'fetching:collection': 'beforeFetchAll',
            fetched: 'afterFetch',
            'fetched:collection': 'afterFetchAll',
            saving: 'beforeSave',
            saved: 'afterSave',
          },
          (method, key) => {
            if (_.isFunction(target[model].lifecycles[method])) {
              this.on(key, target[model].lifecycles[method])
            }
          }
        )
      }

      loadedModel.hidden = _.keys(
        _.keyBy(
          _.filter(definition.attributes, (value, key) => {
            if (
              _.has(value, 'columnName') &&
              !_.isEmpty(value.columnName) &&
              value.columnName !== key
            ) {
              return true
            }
          }),
          'columnName'
        )
      )

      GLOBALS[definition.collectionName] = ORM.model(
        definition.collectionName,
        loadedModel
      )

      db.models.set(
        definition.collectionName,
        GLOBALS[definition.collectionName]
      )

      // Expose ORM functions through the `strapi.api[xxx]models[yyy]`
      // or `strapi.plugins[xxx].models[yyy]` object.
      target[model] = _.assign(
        GLOBALS[definition.collectionName],
        target[model]
      )

      // Push attributes to be aware of model schema.
      target[model]._attributes = definition.attributes
    } catch (err) {
      if (err instanceof TypeError || err instanceof ReferenceError) {
        debug(`Impossible to register the '${model}' model.`)
      }

      debug(err)
      throw err
    }
  }

  await Promise.all(_.map(models, updateModel))
}
