const express = require('express')
const { getCompanies, createCompany, updateCompany } = require('../controllers/company.controller')

const companyRouter = express.Router()

companyRouter.get('/', getCompanies)
companyRouter.post('/', createCompany)
companyRouter.put('/:id', updateCompany)

module.exports = {
  companyRouter,
}
