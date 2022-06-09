const _ = require('lodash')

const withDefaultPagination = (params) => {
  const { page = 1, pageSize = 100, ...rest } = params

  return {
    page: _.toInteger(page),
    pageSize: _.toInteger(pageSize),
    ...rest,
  }
}

const paginationToQueryParams = ({ page, pageSize }) => ({
  _start: Math.max(page - 1, 0) * pageSize,
  _limit: pageSize,
})

const getPaginationQuery = async (queryParams, count, ...args) => {
  const { page, pageSize, ...params } = withDefaultPagination(queryParams)

  const total = await count(params, ...args)
  return {
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
    total,
  }
}

const createPaginatedQuery =
  ({ fetch, count }) =>
  async (queryParams, ...args) => {
    const params = _.omit(queryParams, ['page', 'pageSize'])
    const pagination = await getPaginationQuery(queryParams, count, ...args)

    Object.assign(params, paginationToQueryParams(pagination))
    const results = await fetch(params, undefined, ...args)

    return { results, pagination }
  }

const createSearchPageQuery = ({ search, countSearch }) =>
  createPaginatedQuery({ fetch: search, count: countSearch })

const createFindPageQuery = ({ find, count }) =>
  createPaginatedQuery({ fetch: find, count })

module.exports = {
  getPaginationQuery,
  withDefaultPagination,
  createPaginatedQuery,
  createFindPageQuery,
  createSearchPageQuery,
}
