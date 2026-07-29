const express = require('express')
const {
  getStatements,
  getStatement,
  createStatement,
  updateStatement,
  saveStatementItems,
  getStatementItems,
} = require('../controllers/statement.controller')

const statementRouter = express.Router()

statementRouter.get('/', getStatements)
statementRouter.get('/:id', getStatement)
statementRouter.get('/:id/items', getStatementItems)
statementRouter.post('/', createStatement)
statementRouter.put('/:id', updateStatement)
statementRouter.post('/:id/items', saveStatementItems)

module.exports = {
  statementRouter,
}
