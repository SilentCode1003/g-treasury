const express = require('express')
const { getUsers, createUser, updateUser } = require('../controllers/user.controller')

const userRouter = express.Router()

userRouter.get('/', getUsers)
userRouter.post('/', createUser)
userRouter.put('/:id', updateUser)

module.exports = {
  userRouter,
}
