const _ = require('lodash')

module.exports = (obj) => {
  const serializedDoc = []

  for (const [key, entry] of Object.entries(obj)) {
    const description = _.isObject(entry) ? entry.description : null
    const value = _.isObject(entry) ? entry.value : entry

    let serializedEntry = ''

    if (description) {
      const descriptionLines = description.split('\n')
      for (const line of descriptionLines) {
        serializedEntry += `# ${line}\n`
      }
    }

    serializedEntry += `${key}=${JSON.stringify(value)}`

    serializedDoc.push(serializedEntry)
  }

  return serializedDoc.join('\n\n')
}
