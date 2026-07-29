const express = require('express')
const { getStores, createStore, updateStore } = require('../controllers/store.controller')

const storeRouter = express.Router()

storeRouter.get('/', getStores)
storeRouter.post('/', createStore)
storeRouter.put('/:id', updateStore)

module.exports = {
  storeRouter,
}
