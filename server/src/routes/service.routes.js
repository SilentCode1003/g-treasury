const express = require('express')
const { getServices, createService, updateService } = require('../controllers/service.controller')

const serviceRouter = express.Router()

serviceRouter.get('/', getServices)
serviceRouter.post('/', createService)
serviceRouter.put('/:id', updateService)

module.exports = {
  serviceRouter,
}
