module.exports = {
  load: {
    before: [
      "authorization",
      "responseTime",
      "logger",
      "cors",
      "responses",
      "gzip",
      "passport",
    ],
    after: ["parser", "router"],
  },
  settings: {
    cors: {
      enabled: true,
      origin: "*",
      expose: ["WWW-Authenticate", "Server-Authorization"],
      maxAge: 31536000,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
      headers: [
        "Content-Type",
        "Authorization",
        "X-Authorization",
        "X-Frame-Options",
        "Origin",
        "X-Origin",
      ],
    },
    passport: {
      enabled: true,
    },
    authorization: {
      enabled: true,
    },
    cron: {
      enabled: true,
    },
    csrf: {
      enabled: false,
    },
    language: {
      enabled: true,
      locales: ["en_US"],
      defaultLocale: "en_US",
    },
  },
}
