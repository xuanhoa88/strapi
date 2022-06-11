const _ = require('lodash')

function env(key, defaultValue) {
  return _.has(process.env, key) ? process.env[key] : defaultValue
}

const utils = {
  int(key, defaultValue) {
    if (!_.has(process.env, key)) {
      return defaultValue
    }
    return _.toInteger(process.env[key])
  },

  float(key, defaultValue) {
    if (!_.has(process.env, key)) {
      return defaultValue
    }

    return _.toNumber(process.env[key])
  },

  bool(key, defaultValue) {
    if (!_.has(process.env, key)) {
      return defaultValue
    }

    return process.env[key] === 'true'
  },

  json(key, defaultValue) {
    if (!_.has(process.env, key)) {
      return defaultValue
    }

    const value = process.env[key]
    try {
      return JSON.parse(value)
    } catch (error) {
      throw new Error(
        `Invalid json environment variable ${key}: ${error.message}`
      )
    }
  },

  array(key, defaultValue) {
    if (!_.has(process.env, key)) {
      return defaultValue
    }

    let value = process.env[key]

    if (_.startsWith(value, '[') && _.endsWith(value, ']')) {
      value = value.substring(1, value.length - 1)
    }

    return _.split(value, ',').map((v) => _.trim(_.trim(v, ' '), '"'))
  },

  date(key, defaultValue) {
    if (!_.has(process.env, key)) {
      return defaultValue
    }

    return new Date(process.env[key])
  },
}

Object.assign(env, utils)

module.exports = env
