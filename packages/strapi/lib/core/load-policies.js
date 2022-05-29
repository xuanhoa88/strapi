const assert = require("assert")
const path = require("path")
const fs = require("fs")

const loadPolicy = (file) => {
  try {
    const policy = require(file)

    assert(typeof policy === "function", "Policy must be a function.")

    return policy
  } catch (error) {
    throw `Could not load policy ${file}: ${error.message}`
  }
}

module.exports = (dir) => {
  if (!fs.existsSync(dir)) return {}

  const root = {}
  const paths = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((fd) => fd.isFile())

  for (const fd of paths) {
    const { name } = fd
    const fullPath = dir + path.sep + name

    const ext = path.extname(name)
    const key = path.basename(name, ext)
    root[key] = loadPolicy(fullPath)
  }
  return root
}
