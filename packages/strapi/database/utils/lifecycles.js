const _ = require('lodash')

const executeLifecycle = async (db, lifecycle, model, ...args) => {
  // Run registered lifecycles
  await db.lifecycles.run(lifecycle, model, ...args)

  // Run user lifecycles
  if (_.has(model, `lifecycles.${lifecycle}`)) {
    await model.lifecycles[lifecycle](...args)
  }
}

const executeBeforeLifecycle = (db, lifecycle, model, ...args) =>
  executeLifecycle(db, `before${_.upperFirst(lifecycle)}`, model, ...args)

const executeAfterLifecycle = (db, lifecycle, model, ...args) =>
  executeLifecycle(db, `after${_.upperFirst(lifecycle)}`, model, ...args)

module.exports = {
  executeBeforeLifecycle,
  executeAfterLifecycle,
}
