'use strict'
require('dotenv').config()
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { logger } = require('../utilities/logger.util')
const { SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Query } = require('../database/utilities/queries.util')
const rateLimit = require('express-rate-limit')
const path = require('path')
const fs = require('fs')

const SQL = new SQLQueryBuilder()

require('dotenv').config()

const auth = async (req, res, next) => {
  try {
    let token = req.session.jwt

    if (!token && req.headers['authorization']) {
      token = req.headers['authorization'].split(' ')[1]
    }

    if (!token) {
      return handleUnauthorized(req, res)
    }

    const secret = process.env.SECRET_KEY || process.env._SECRET_KEY
    const decodedUser = jwt.verify(token, secret)

    req.context = {
      ...decodedUser,
    }

    return next()
  } catch (err) {
    console.log(err)
    return handleUnauthorized(req, res, 'Authentication failed.')
  }
}

const handleUnauthorized = (req, res, message = 'Unauthorized: Please login.') => {
  res.status(401)

  if (req.accepts('html')) {
    const filePath = path.join(__dirname, '..', 'views', '401.html')

    fs.readFile(filePath, 'utf8', (err, htmlData) => {
      if (err) {
        return res.send(`<h1>Access Denied</h1><p>${message}</p>`)
      }

      const finalHtml = htmlData.replace('{{ERROR_MESSAGE}}', message)

      res.send(finalHtml)
    })
    return
  }

  return res.json({ message })
}

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many OTP requests, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
})

module.exports = { auth, otpLimiter }
