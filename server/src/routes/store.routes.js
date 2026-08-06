const express = require('express')
const multer = require('multer')
const { getStores, createStore, updateStore, downloadTemplate, uploadStores, getUniqueCities } = require('../controllers/store.controller')

const storeRouter = express.Router()

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
})

// Define specific routes before parameterized routes
storeRouter.get('/', getStores)
storeRouter.get('/download-template', downloadTemplate)
storeRouter.get('/unique-cities', getUniqueCities)
storeRouter.post('/', createStore)
storeRouter.post('/upload', upload.single('file'), uploadStores)
storeRouter.put('/:id', updateStore)

module.exports = {
  storeRouter,
}
