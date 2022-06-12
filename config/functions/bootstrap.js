/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 */
process.on('unhandledRejection', (reason, p) => {
  console.log(reason, 'Unhandled Rejection at Promise', p)
})

process.on('uncaughtException', (err) => {
  console.log(err, 'Uncaught Exception thrown')
})
