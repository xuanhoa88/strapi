const escapeQuery = (query, charsToEscape, escapeChar = '\\') =>
  query
    .split('')
    .reduce(
      (escapedQuery, char) =>
        charsToEscape.includes(char)
          ? `${escapedQuery}${escapeChar}${char}`
          : `${escapedQuery}${char}`,
      ''
    )

module.exports = {
  escapeQuery,
}
