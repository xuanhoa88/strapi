module.exports = {
  timeout: 100000,
  load: {
    before: ['socket.io'],
    order: [
      "Define the hooks' load order by putting their names in this array in the right order",
    ],
    after: [],
  },
  settings: {
    'socket.io': {
      enabled: true,
    },
  },
}
