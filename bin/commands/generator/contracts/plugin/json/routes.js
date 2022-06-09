/**
 * Expose main routes of the generated plugin
 */

module.exports = (scope) => ({
  prefix: `/${scope.route}`,
  routes: [
    {
      method: 'GET',
      path: '/',
      handler: `${scope.name}.index`,
      config: {
        policies: [],
      },
    },
  ],
})
