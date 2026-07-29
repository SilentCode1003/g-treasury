require('dotenv').config()
const { DecryptString } = require('../../utilities/cryptography.util')

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: DecryptString(process.env.DB_PASSWORD),
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    mongoUrl: process.env.MONGODB_URL,
    sessionCookieName: process.env.SESSION_COLLECTION,
    sessionSecret: process.env.SESSION_SECRET,
    dialect: 'mysql',
    dialectOptions: { multipleStatements: true },
  },
  staging: {
    username: process.env.DB_USER,
    password: DecryptString(process.env.DB_PASSWORD),
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    mongoUrl: process.env.MONGODB_URL,
    sessionCookieName: process.env.SESSION_COLLECTION,
    sessionSecret: process.env.SESSION_SECRET,
    dialect: 'mysql',
    dialectOptions: { multipleStatements: true },
  },
  production: {
    username: process.env.DB_USER,
    password: DecryptString(process.env.DB_PASSWORD),
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    mongoUrl: process.env.MONGODB_URL,
    sessionCookieName: process.env.SESSION_COLLECTION,
    sessionSecret: process.env.SESSION_SECRET,
    dialect: 'mysql',
    dialectOptions: { multipleStatements: true },
    logging: false,
  },
}
