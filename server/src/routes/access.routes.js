const express = require('express')
const { getAccess, createAccess, updateAccess } = require('../controllers/access.controller')

const accessRouter = express.Router()

accessRouter.get('/', getAccess)
accessRouter.post('/', createAccess)
accessRouter.put('/:id', updateAccess)

module.exports = {
  accessRouter,
}
