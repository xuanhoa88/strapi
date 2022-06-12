const fs = require('fs')
const ini = require('ini')

module.exports = (src, encoding = 'utf-8') => {
  // Convert buffer to string
  const lines = fs.readFileSync(src, { encoding })
  return ini.parse(lines)
}
