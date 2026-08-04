const express = require('express')
const {
  getRouteAccess,
  getRouteAccessByAccessId,
  createRouteAccess,
  updateRouteAccess,
} = require('../controllers/route_access.controller')

const routeAccessRouter = express.Router()

routeAccessRouter.get('/', getRouteAccess)
routeAccessRouter.get('/access/:accessId', getRouteAccessByAccessId)
routeAccessRouter.post('/', createRouteAccess)
routeAccessRouter.put('/:id', updateRouteAccess)

module.exports = {
  routeAccessRouter,
}
