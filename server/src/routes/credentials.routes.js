const express = require('express')
const { login, logout } = require('../controllers/credentials.controller')

const credentialsRouter = express.Router()

credentialsRouter.post('/login', login)
credentialsRouter.post('/logout', logout)

module.exports = {
  credentialsRouter,
}
