const { isValid, format, formatISO } = require('date-fns')
const { has } = require('lodash')

const defaultFormatter = {
  json: (value) => {
    if (typeof value === 'object') return value
    return JSON.parse(value)
  },
  boolean: (value) => {
    if (typeof value === 'boolean') {
      return value
    }

    const strVal = value.toString()
    if (strVal === '1') {
      return true
    }
    if (strVal === '0') {
      return false
    }
    return null
  },
  date: (value) => {
    const cast = new Date(value)
    return isValid(cast) ? formatISO(cast, { representation: 'date' }) : null
  },
  datetime: (value) => {
    const cast = new Date(value)
    return isValid(cast) ? cast.toISOString() : null
  },
  timestamp: (value) => {
    const cast = new Date(value)
    return isValid(cast) ? format(cast, 'T') : null
  },
}

const formatters = {
  sqlite3: {
    biginteger: (value) => value.toString(),
  },
}

const createFormatter =
  (client) =>
  ({ type }, value) => {
    if (value === null) return null

    const formatter = {
      ...defaultFormatter,
      ...formatters[client],
    }

    if (has(formatter, type)) {
      return formatter[type](value)
    }

    return value
  }

module.exports = {
  createFormatter,
}
