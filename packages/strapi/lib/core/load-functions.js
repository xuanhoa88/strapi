const fs = require("fs")
const walk = require("./walk")

const loadFunction = (file) => {
  try {
    return require(file)
  } catch (error) {
    throw `Could not load function ${file}: ${error.message}`
  }
}

module.exports = (dir) => {
  if (!fs.existsSync(dir)) return {}

  return walk(dir, { loader: loadFunction })
}
