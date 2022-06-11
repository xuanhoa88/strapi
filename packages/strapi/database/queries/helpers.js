const { replaceIdByPrimaryKey } = require('../utils/primary-key')
const {
  executeBeforeLifecycle,
  executeAfterLifecycle,
} = require('../utils/lifecycles')

const withLifecycles =
  (db, { query, model, fn }) =>
  async (params, ...rest) => {
    // substitute id for primaryKey value in params
    const newParams = replaceIdByPrimaryKey(params, model)
    const queryArguments = [newParams, ...rest]

    // execute before hook
    await executeBeforeLifecycle(db, query, model, ...queryArguments)

    // execute query
    const result = await fn(...queryArguments)

    // execute after hook with result and arguments
    await executeAfterLifecycle(db, query, model, result, ...queryArguments)

    // return result
    return result
  }

// wraps a connectorQuery call with:
// - param substitution
// - lifecycle hooks
const createQueryWithLifecycles = (db, { query, model, connectorQuery }) =>
  withLifecycles(db, {
    query,
    model,
    fn: (...queryParameters) => connectorQuery[query](...queryParameters),
  })

module.exports = { withLifecycles, createQueryWithLifecycles }
