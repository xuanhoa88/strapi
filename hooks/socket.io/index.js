const socketIO = require("socket.io")

module.exports = (strapi) => {
  const hook = {
    /**
     * Default options
     */

    defaults: {
      // config object
    },

    /**
     * Initialize the hook
     */

    initialize: (cb) => {
      process.nextTick(() => {
        const io = socketIO(strapi.server, {
          path: "/ws",
          cors: {
            origin: true,
          },
        })

        io.on("connection", (socket) => {
          socket.on("logged", (user) => {
            socket.join(user)
          })
          socket.on("logout", (user) => {
            socket.leave(user)
          })
        })

        strapi.io = io
      })

      cb()
    },
  }

  return hook
}
