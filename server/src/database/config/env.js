const path = require('path')
const { z } = require('zod')
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') })

const envSchema = z.object({
  //Server Configuration
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  VITE_ENV: z.enum(['development', 'staging', 'production']),
  VITE_PRODUCTION_API: z.string().optional(),
  VITE_DEVELOPMENT_API: z.string().min(1, 'VITE_DEVELOPMENT_API is required'),
  VITE_SERVER_API_PORT: z.string().min(1, 'VITE_SERVER_API_PORT is required'),
  VITE_CLIENT_PORT: z.string().min(1, 'VITE_CLIENT_PORT is required'),
  VITE_ALLOWED_ORIGIN: z.string().default('.localhost,.5lsolutions.com'),
  SERVER_HOST: z.string().min(1, 'SERVER_HOST is required'),

  //Database Configuration
  DB_HOST: z.string().min(1, 'DB_HOST is required'),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required'),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),
  DB_PORT: z.string().default('3306'),

  //MongoDB Configuration
  MONGODB_URL: z.string().min(1, 'MONGODB_URL is required'),
  SESSION_COLLECTION: z.string().min(1, 'SESSION_COLLECTION is required'),
  SESSION_SECRET: z.string().min(1, 'SESSION_SECRET is required'),
  HTTPS_SECURE: z.string().default('false'),
  SECRET_KEY: z.string().min(1, 'SECRET_KEY is required'),

  //Cryptography Configuration
  ENCRYPTION_ALGORITHM: z.string().min(1, 'ENCRYPTION_ALGORITHM is required'),
  ENCRYPTION_IV: z.string().min(1, 'ENCRYPTION_IV is required'),
  ENCRYPTION_KEY: z.string().min(1, 'ENCRYPTION_KEY is required'),

  //Email Configuration
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),

  //Version
  APP_VERSION: z.string().optional(),
})

const validateEnv = () => {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('\n❌ Invalid Environment Variables:')

    result.error.issues.forEach((issue) => {
      console.error(`   - ${issue.path.join('.')}: ${issue.message}`)
    })

    console.log('\n💡 Check your .env file and ensure all required variables are set correctly.\n')
    process.exit(1)
  }

  const optionalKeys = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASSWORD', 'APP_VERSION']

  const environmentWarnings = []

  optionalKeys.forEach((key) => {
    if (!result.data[key] || result.data[key].trim() === '') {
      environmentWarnings.push(`${key} is empty or not set. Related features may be disabled.`)
    }
  })

  result.data._warnings = environmentWarnings

  return result.data
}

const env = validateEnv()

module.exports = env
