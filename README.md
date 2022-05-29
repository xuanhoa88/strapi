# API Server


## Overview/Introducion

## Requirements

- Node.js (>=14.0)
- Docker 1.12
- Docker Compose

## Frameworks

- [Strapi](https://strapi.io) Web application framework based on [Koa.js](http://koajs.com)
- [Knex](https://knexjs.org) — SQL query builder for PostgreSQL, CockroachDB, MSSQL, MySQL, MariaDB, SQLite3, Better-SQLite3, Oracle, and Amazon Redshift 
- [Bookshelf](http://bookshelfjs.org) — ORM Mapping

## Setup

```
npm install
```

## Running the backend

```
npm run dev

```


## Project Structure

```
├── api
│   ├── app
│   │   ├── config         -> URL Routes
│   │   ├── controllers    -> Controllers binding actions to services
│   │   ├── models         -> Model definition, hooks & computed properties
│   │   └── services       -> Global available model service
│   ├── ...
├── config
│   ├── environments
│   │   ├── development
│   │   │   ├── databases.json -> Database config
│   │   │   ├── security.json  -> security config (e.g CSRF)
│   │   │   └── server.json    -> host, port & middeware config
│   └── locales            -> translations
├── data
│   ├── migrations         -> database migrations
│   └── seeds              -> database seeds
```
