const _ = require('lodash')
const parseType = require('./parse-type')

const convertType = (name, attr) => {
  if (_.has(attr, 'columnType')) {
    return { type: attr.columnType }
  }

  switch (_.toLower(attr.type)) {
    case 'array':
      return { type: Array }
    case 'boolean':
      return { type: 'Boolean' }
    case 'binary':
      return { type: 'Buffer' }
    case 'time':
      return {
        type: String,
        validate: (value) =>
          (!attr.required && _.isNil(value)) ||
          parseType({ type: 'time', value }),
        set: (value) =>
          !attr.required && _.isNil(value)
            ? value
            : parseType({ type: 'time', value }),
      }
    case 'date':
      return {
        type: String,
        validate: (value) =>
          (!attr.required && _.isNil(value)) ||
          parseType({ type: 'date', value }),
        set: (value) =>
          !attr.required && _.isNil(value)
            ? value
            : parseType({ type: 'date', value }),
      }
    case 'datetime':
      return {
        type: Date,
      }
    case 'timestamp':
      return {
        type: Date,
      }
    case 'decimal':
      return { type: 'Decimal' }
    case 'float':
      return { type: 'Float' }
    case 'json':
      return { type: 'Mixed' }
    case 'biginteger':
      return { type: 'Long' }
    case 'integer':
      return { type: 'Number' }
    case 'uuid':
      return { type: 'ObjectId' }
    case 'enumeration':
      return {
        type: 'String',
        enum: attr.enum.concat(null),
        default: null,
      }
    case 'email':
    case 'password':
    case 'string':
    case 'text':
    case 'richtext':
      return { type: 'String' }
    case 'uid': {
      return {
        type: 'String',
        index: {
          unique: true,
          partialFilterExpression: { [name]: { $type: 'string' } },
        },
      }
    }
    default:
      return undefined
  }
}

const isMongoId = (value) => {
  if (value instanceof mongoose.Types.ObjectId) {
    return true
  }

  if (!_.isString(value)) {
    return false
  }

  // Here we don't use mongoose.Types.ObjectId.isValid method because it's a weird check,
  // it returns for instance true for any integer value
  const hexadecimal = /^[0-9A-F]+$/i
  return hexadecimal.test(value) && value.length === 24
}

const valueToId = (value) => {
  if (Array.isArray(value)) return value.map(valueToId)

  if (isMongoId(value)) {
    return mongoose.Types.ObjectId(value)
  }

  return value
}

module.exports = {
  convertType,
  valueToId,
  isMongoId,
}
