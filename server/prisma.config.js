require('dotenv/config')
const { defineConfig } = require('prisma/config')

module.exports = defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Not required for `prisma generate`, so npm install works before .env exists
    url: process.env.DATABASE_URL,
  },
})
