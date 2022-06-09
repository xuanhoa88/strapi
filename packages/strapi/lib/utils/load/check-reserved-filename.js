const _ = require('lodash')

// files to load with filename key
const prefixedPaths = [
  'functions',
  'policies',
  'locales',
  'hooks',
  'middlewares',
  'language',
  'helpers',
]

module.exports = function checkReservedFilenames(file) {
  return !!_.some(prefixedPaths, (e) => file.indexOf(`config/${e}`) >= 0)
}
