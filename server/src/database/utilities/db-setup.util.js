const mysql = require('mysql2/promise')
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs') // 1. Added fs module
const CONFIG = require('../config/config')
require('dotenv').config()
;(async () => {
  const env = process.env.VITE_ENV || 'development'
  const config = CONFIG[env]

  const dbName = config.database
  const dbUser = config.username
  const dbPass = config.password
  const dbHost = config.host
  const dbPort = config.port || 3306

  try {
    const connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPass,
      port: dbPort,
    })

    const [rows] = await connection.query(`SHOW DATABASES LIKE ?`, [dbName])

    if (rows.length === 0) {
      await connection.query(`CREATE DATABASE \`${dbName}\`;`)
      console.log(`✅ Database '${dbName}' created.`)
    } else {
      console.log(`ℹ️  Database '${dbName}' already exists.`)
    }

    await connection.end()

    console.log(`📦 Running migrations...`)
    execSync('npx sequelize-cli db:migrate', { stdio: 'inherit' })

    console.log(`🌱 Running seeders...`)
    execSync('npx sequelize-cli db:seed:all --debug', { stdio: 'inherit' })

    try {
      require('./generate-models.util')
      console.log(`✅ Models generated successfully`)
    } catch (error) {
      console.log(`❌ Error generating models:`, error)
      throw error
    }

    console.log(`🚀 Database setup complete.`)
  } catch (error) {
    console.error('❌ Error during DB setup:', error)
    process.exit(1)
  }
})()
