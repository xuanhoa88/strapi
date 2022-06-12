const _ = require('lodash')
const mongoose = require('mongoose')
const debug = require('debug')('strapi-database:mongoose')
const { convertType } = require('./utils')

module.exports = async ({ models, target }, ctx) => {
  const { GLOBALS, db, instance, env } = ctx

  function mountModel(model) {
    const definition = models[model]
    definition.orm = 'mongoose'
    definition.loadedModel = {}

    // Set the default values to model settings.
    _.defaults(definition, {
      primaryKey: '_id',
      primaryKeyType: 'string',
    })

    const scalarAttributes = _.keys(definition.attributes).filter((key) => {
      const { type } = definition.attributes[key]
      return type !== undefined && type !== null
    })

    // handle scalar attrs
    scalarAttributes.forEach((name) => {
      const attr = definition.attributes[name]
      definition.loadedModel[name] = {
        ...attr,
        ...convertType(name, attr),
        // no require constraint to allow components in drafts
        required: !!definition.required,
      }
    })

    const schema = new instance.Schema(
      _.omitBy(definition.loadedModel, ({ type }) => type === 'virtual')
    )

    // Add virtual key to provide populate and reverse populate
    _.forEach(
      _.pickBy(definition.loadedModel, ({ type }) => type === 'virtual'),
      (value, key) => {
        schema.virtual(key, {
          ref: value.ref,
          localField: '_id',
          foreignField: value.via,
          justOne: value.justOne || false,
        })
      }
    )

    schema.set(
      'minimize',
      _.get(definition, 'options.minimize', false) === true
    )

    // eslint-disable-next-line no-multi-assign
    schema.options.toObject = schema.options.toJSON = {
      virtuals: true,
      transform(doc, returned) {
        // Remover $numberDecimal nested property.

        _.keys(returned)
          .filter((key) => returned[key] instanceof mongoose.Types.Decimal128)
          .forEach((key) => {
            // Parse to float number.
            returned[key] = parseFloat(returned[key].toString())
          })
      },
    }

    // Instantiate model.
    const Model = instance.model(
      definition.globalId,
      schema,
      definition.collectionName
    )

    const handleIndexesErrors = () => {
      Model.on('index', (error) => {
        if (error) {
          if (error.code === 11000) {
            debug(
              `Unique constraint fails, make sure to update your data and restart to apply the unique constraint.\n\t- ${error.message}`
            )
          } else {
            debug(
              `An index error happened, it wasn't applied.\n\t- ${error.message}`
            )
          }
        }
      })
    }

    // Only sync indexes when not in production env while it's not possible to create complex indexes directly from models
    // In production it will simply create missing indexes (those defined in the models but not present in db)
    if (env !== 'production') {
      // Ensure indexes are synced with the model, prevent duplicate index errors
      // Side-effect: Delete all the indexes not present in the model.json
      Model.syncIndexes(null, handleIndexesErrors)
    } else {
      handleIndexesErrors()
    }

    GLOBALS[definition.collectionName] = Model

    db.models.set(definition.collectionName, GLOBALS[definition.collectionName])

    // Expose ORM functions through the `strapi.api[xxx]models[yyy]`
    // or `strapi.plugins[xxx].models[yyy]` object.
    target[model] = _.assign(GLOBALS[definition.collectionName], target[model])

    // Expose ORM functions through the `target` object.
    target[model] = _.assign(Model, target[model])

    // Push attributes to be aware of model schema.
    target[model]._attributes = definition.attributes
  }

  // Instantiate every models
  _.keys(models).forEach(mountModel)
}
