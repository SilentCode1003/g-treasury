const express = require('express')
const multer = require('multer')
const { getStores, createStore, updateStore, downloadTemplate, uploadStores } = require('../controllers/store.controller')

const storeRouter = express.Router()

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
})

storeRouter.get('/', getStores)
storeRouter.post('/', createStore)
storeRouter.put('/:id', updateStore)
storeRouter.get('/download-template', downloadTemplate)
storeRouter.post('/upload', upload.single('file'), uploadStores)

module.exports = {
  storeRouter,
}
