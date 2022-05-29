# API Server


## Overview/Introducion

## Requirements

- Node.js (>=14.0)
- Docker 1.12
- Docker Compose

## Frameworks

- [Strapi](https://strapi.io) Web application framework based on [Koa.js](http://koajs.com)
- [Bookshelf](http://bookshelfjs.org) — ORM Mapping
- [Passport](https://passportjs.org) — Authentication
- [Redis](http://redis.io) — Session storage
- [RabbitMQ](https://rabbitmq.com) — Queue to communicate with 3rd party APIs

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
│   │   ├── config
│   │   ├── controllers
│   │   └── policies       -> Global policies
│   ├── ...
│   ├── api
│   │   ├── config         -> URL Routes
│   │   ├── controllers    -> Controllers binding actions to services
│   │   ├── models         -> Model definition, hooks & computed properties
│   │   └── services       -> Global available model service
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
