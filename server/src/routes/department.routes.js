const express = require('express')
const {
  getDepartments,
  createDepartment,
  updateDepartment,
} = require('../controllers/department.controller')

const departmentRouter = express.Router()

departmentRouter.get('/', getDepartments)
departmentRouter.post('/', createDepartment)
departmentRouter.put('/:id', updateDepartment)

module.exports = {
  departmentRouter,
}
