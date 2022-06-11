module.exports = ({ env }) => ({
  defaultConnection: 'bookshelf',
  connections: {
    bookshelf: {
      client: 'postgres',
      connection: {
        host: env('DATABASE_HOST', '127.0.0.1'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'faktoora'),
        user: env('DATABASE_USERNAME', 'faktoora'),
        password: env('DATABASE_PASSWORD', '1234abcd'),
        schema: env('DATABASE_SCHEMA', 'public'), // Not required
      },
      options: {
        migrations: {
          directory: './database/migrations',
        },
        seeds: {
          directory: './database/seeds',
        },
      },
    },
  },
})
