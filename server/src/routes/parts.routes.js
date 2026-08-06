const express = require('express')
const {
  getParts,
  createPart,
  updatePart,
} = require('../controllers/parts.controller')

const partsRouter = express.Router()

partsRouter.get('/', getParts)
partsRouter.post('/', createPart)
partsRouter.put('/:id', updatePart)

module.exports = {
  partsRouter,
}
