require('dotenv').config()

const isProduction = process.env.VITE_ENV === 'production'

const allowedOrigins = isProduction
  ? [process.env.VITE_PRODUCTION_API]
  : [
      `http://${process.env.SERVER_HOST}:${process.env.VITE_CLIENT_PORT}`,
      `http://${process.env.SERVER_HOST}:${process.env.VITE_SERVER_API_PORT}`,
      `http://localhost:${process.env.VITE_CLIENT_PORT}`,
    ]

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
}

module.exports = {
  corsOptions,
}
