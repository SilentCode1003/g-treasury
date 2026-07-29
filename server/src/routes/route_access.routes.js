const express = require('express')
const {
  getRouteAccess,
  createRouteAccess,
  updateRouteAccess,
} = require('../controllers/route_access.controller')

const routeAccessRouter = express.Router()

routeAccessRouter.get('/', getRouteAccess)
routeAccessRouter.post('/', createRouteAccess)
routeAccessRouter.put('/:id', updateRouteAccess)

module.exports = {
  routeAccessRouter,
}
