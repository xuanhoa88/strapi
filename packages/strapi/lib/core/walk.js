const assert = require("assert")
const path = require("path")
const fs = require("fs")
const { isNotJunk } = require("../utils/junk")

function walk(dir, { loader } = {}) {
  assert(typeof loader === "function", "opts.loader must be a function")

  const root = {}
  const paths = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((file) => file.isFile() && isNotJunk(file.name))

  for (const fd of paths) {
    const { name } = fd
    const fullPath = dir + path.sep + name

    if (fd.isDirectory()) {
      root[name] = walk(fullPath, { loader })
    } else {
      const ext = path.extname(name)
      const key = path.basename(name, ext)
      root[key] = loader(fullPath)
    }
  }

  return root
}

module.exports = walk
