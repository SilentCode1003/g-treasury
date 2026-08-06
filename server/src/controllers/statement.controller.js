require('dotenv').config()
const { Query, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Statement } = require('../database/model/Statement')
const {
  buildStatementCreatePayload,
  calculateStatementSaveTotal,
  buildStatementHeaders,
} = require('../utilities/statement.util')

const sql = new SQLQueryBuilder()

const getStatements = async (req, res, next) => {
  try {
    const { sql: query, bindings } = sql
      .select([
        { col: Statement.statement_of_account.selectOptionColumns.id, as: 'soa_id' },
        {
          col: Statement.statement_of_account.selectOptionColumns.company_from,
          as: 'soa_company_from',
        },
        {
          col: Statement.statement_of_account.selectOptionColumns.company_to,
          as: 'soa_company_to',
        },
        { col: Statement.statement_of_account.selectOptionColumns.date, as: 'soa_date' },
        { col: Statement.statement_of_account.selectOptionColumns.title, as: 'soa_title' },
        { col: Statement.statement_of_account.selectOptionColumns.headers, as: 'soa_headers' },
        { col: Statement.statement_of_account.selectOptionColumns.sub_total, as: 'soa_sub_total' },
        { col: Statement.statement_of_account.selectOptionColumns.vat, as: 'soa_vat' },
        { col: Statement.statement_of_account.selectOptionColumns.total, as: 'soa_total' },
        {
          col: Statement.statement_of_account.selectOptionColumns.prepared_by,
          as: 'soa_prepared_by',
        },
        {
          col: Statement.statement_of_account.selectOptionColumns.statement_type,
          as: 'soa_statement_type',
        },
        {
          col: Statement.statement_of_account.selectOptionColumns.maintenance_format,
          as: 'soa_maintenance_format',
        },
      ])
      .from(Statement.statement_of_account.tablename)
      .build()

    const statements = await Query(query, bindings)

    return res.status(200).json({
      success: true,
      message: 'Statement of accounts retrieved successfully',
      data: statements,
      count: statements.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching statement of accounts:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching statement of accounts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const getStatement = async (req, res, next) => {
  try {
    const statementId = Number(req.params.id)

    if (!statementId) {
      return res.status(400).json({
        success: false,
        message: 'Statement id is required',
      })
    }

    const { sql: query, bindings } = sql
      .select([
        { col: Statement.statement_of_account.selectOptionColumns.id, as: 'soa_id' },
        {
          col: Statement.statement_of_account.selectOptionColumns.company_from,
          as: 'soa_company_from',
        },
        {
          col: Statement.statement_of_account.selectOptionColumns.company_to,
          as: 'soa_company_to',
        },
        { col: Statement.statement_of_account.selectOptionColumns.date, as: 'soa_date' },
        { col: Statement.statement_of_account.selectOptionColumns.title, as: 'soa_title' },
        { col: Statement.statement_of_account.selectOptionColumns.headers, as: 'soa_headers' },
        { col: Statement.statement_of_account.selectOptionColumns.sub_total, as: 'soa_sub_total' },
        { col: Statement.statement_of_account.selectOptionColumns.vat, as: 'soa_vat' },
        { col: Statement.statement_of_account.selectOptionColumns.total, as: 'soa_total' },
        {
          col: Statement.statement_of_account.selectOptionColumns.prepared_by,
          as: 'soa_prepared_by',
        },
        {
          col: Statement.statement_of_account.selectOptionColumns.statement_type,
          as: 'soa_statement_type',
        },
        {
          col: Statement.statement_of_account.selectOptionColumns.maintenance_format,
          as: 'soa_maintenance_format',
        },
      ])
      .from(Statement.statement_of_account.tablename)
      .where(Statement.statement_of_account.selectOptionColumns.id, statementId)
      .build()

    const statements = await Query(query, bindings)

    if (statements.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Statement of account not found',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Statement of account retrieved successfully',
      data: statements[0],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching statement of account:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching statement of account',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const createStatement = async (req, res, next) => {
  try {
    const payload = buildStatementCreatePayload(req.body, req)
    const { company_from, company_to, date, title, headers, sub_total, vat, total, prepared_by, statement_type, maintenance_format } =
      payload

    if (!company_from || !company_to || !date || !title) {
      return res.status(400).json({
        success: false,
        message: 'Company from, company to, date, and title are required',
      })
    }

    const insertQuery = sql
      .insert(
        Statement.statement_of_account.tablename,
        {
          company_from,
          company_to,
          date,
          title,
          headers: headers
            ? typeof headers === 'string'
              ? headers
              : JSON.stringify(headers)
            : null,
          sub_total: Number(sub_total || 0),
          vat: Number(vat || 0),
          total: Number(total || 0),
          prepared_by,
          statement_type: statement_type || 'SERVICE',
          maintenance_format: maintenance_format || null,
        },
        { prefix: Statement.statement_of_account.prefix },
      )
      .build()

    const result = await Query(insertQuery.sql, insertQuery.bindings)

    return res.status(201).json({
      success: true,
      message: 'Statement of account created successfully',
      data: {
        soa_id: result.insertId,
        soa_company_from: company_from,
        soa_company_to: company_to,
        soa_date: date,
        soa_title: title,
        soa_headers: headers
          ? typeof headers === 'string'
            ? headers
            : JSON.stringify(headers)
          : null,
        soa_sub_total: Number(sub_total || 0),
        soa_vat: Number(vat || 0),
        soa_total: Number(total || 0),
        soa_prepared_by: prepared_by,
        soa_statement_type: statement_type || 'SERVICE',
        soa_maintenance_format: maintenance_format || null,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error creating statement of account:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while creating statement of account',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const updateStatement = async (req, res, next) => {
  try {
    const statementId = Number(req.params.id)
    const { company_from, company_to, date, title, headers, sub_total, vat, total, prepared_by, statement_type, maintenance_format } =
      req.body

    if (!statementId) {
      return res.status(400).json({
        success: false,
        message: 'Statement id is required',
      })
    }

    const updateData = {}
    if (company_from !== undefined) updateData.company_from = company_from
    if (company_to !== undefined) updateData.company_to = company_to
    if (date !== undefined) updateData.date = date
    if (title !== undefined) updateData.title = title
    if (headers !== undefined)
      updateData.headers =
        typeof headers === 'string' ? headers : JSON.stringify(headers)
    if (sub_total !== undefined) updateData.sub_total = Number(sub_total || 0)
    if (vat !== undefined) updateData.vat = Number(vat || 0)
    if (total !== undefined) updateData.total = Number(total || 0)
    if (prepared_by !== undefined) updateData.prepared_by = prepared_by
    if (statement_type !== undefined) updateData.statement_type = statement_type
    if (maintenance_format !== undefined) updateData.maintenance_format = maintenance_format

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one field is required to update',
      })
    }

    const updateQuery = sql
      .update(Statement.statement_of_account.tablename, updateData, {
        prefix: Statement.statement_of_account.prefix,
      })
      .where(Statement.statement_of_account.selectOptionColumns.id, statementId)
      .build()

    const result = await Query(updateQuery.sql, updateQuery.bindings)

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: 'Statement of account not found',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Statement of account updated successfully',
      data: {
        soa_id: statementId,
        ...updateData,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error updating statement of account:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while updating statement of account',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const saveStatementItems = async (req, res, next) => {
  try {
    const statementId = Number(req.params.id)
    const payload = req.body || {}
    const rows = Array.isArray(payload.rows) ? payload.rows : []

    if (!statementId) {
      return res.status(400).json({
        success: false,
        message: 'Statement id is required',
      })
    }

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: 'At least one row is required to save',
      })
    }

    const fieldNames = Array.isArray(payload.fieldNames)
      ? payload.fieldNames
      : Array.isArray(payload.headers)
        ? payload.headers
        : []
    const headerNames = Array.isArray(payload.headerNames) ? payload.headerNames : fieldNames
    const vatMode = Boolean(payload.vatMode)
    const quantityMode = Boolean(payload.quantityMode)
    const columnMeta = Array.isArray(payload.columnMeta) ? payload.columnMeta : []

    // Use headers from frontend if provided (for DR NO/RT NO toggles),
    // otherwise build them from headerNames
    let headers = Array.isArray(payload.headers)
      ? payload.headers
      : buildStatementHeaders(headerNames, {
          vatMode,
          quantityMode,
          quantityMeta: columnMeta,
        })

    const calculatedTotals = calculateStatementSaveTotal(rows, fieldNames, {
      vatMode,
      quantityMode,
      quantityMeta: columnMeta,
      returnObject: true,
    })

    const existingItemsQuery = sql
      .select([Statement.statement_items.selectOptionColumns.id])
      .from(Statement.statement_items.tablename)
      .where(Statement.statement_items.selectOptionColumns.statement_id, statementId)
      .build()

    const existingItems = await Query(existingItemsQuery.sql, existingItemsQuery.bindings)

    // If there are existing item rows for this statement, remove them first
    if (existingItems.length > 0) {
      const deleteQuery = sql
        .delete(Statement.statement_items.tablename)
        .where(Statement.statement_items.selectOptionColumns.statement_id, statementId)
        .build()
      await Query(deleteQuery.sql, deleteQuery.bindings)
    }

    // Insert each table row as a separate statement_items row
    const rowsToInsert = rows.map((r) => ({
      statement_id: statementId,
      items: JSON.stringify({
        ...r,
        vatMode,
        headers,
      }),
    }))

    if (rowsToInsert.length > 0) {
      const insertQuery = sql
        .insert(Statement.statement_items.tablename, rowsToInsert, {
          prefix: Statement.statement_items.prefix,
        })
        .build()
      await Query(insertQuery.sql, insertQuery.bindings)
    }

    const updateStatementQuery = sql
      .update(
        Statement.statement_of_account.tablename,
        {
          total: Number(calculatedTotals.total.toFixed(2)),
          sub_total: Number(calculatedTotals.subTotal.toFixed(2)),
          vat: Number(calculatedTotals.vat.toFixed(2)),
          headers: headers.length ? JSON.stringify(headers) : null,
        },
        {
          prefix: Statement.statement_of_account.prefix,
        },
      )
      .where(Statement.statement_of_account.selectOptionColumns.id, statementId)
      .build()

    await Query(updateStatementQuery.sql, updateStatementQuery.bindings)

    return res.status(200).json({
      success: true,
      message: 'Statement rows saved successfully',
      data: {
        statement_id: statementId,
        rows,
        total: Number(calculatedTotals.total.toFixed(2)),
        subTotal: Number(calculatedTotals.subTotal.toFixed(2)),
        vat: Number(calculatedTotals.vat.toFixed(2)),
        vatMode,
        headers,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error saving statement rows:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while saving statement rows',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const getStatementItems = async (req, res, next) => {
  try {
    const statementId = Number(req.params.id)

    if (!statementId) {
      return res.status(400).json({ success: false, message: 'Statement id is required' })
    }

    const existingItemsQuery = sql
      .select([
        Statement.statement_items.selectOptionColumns.items,
        Statement.statement_items.selectOptionColumns.id,
      ])
      .from(Statement.statement_items.tablename)
      .where(Statement.statement_items.selectOptionColumns.statement_id, statementId)
      .build()

    const items = await Query(existingItemsQuery.sql, existingItemsQuery.bindings)

    if (!items || items.length === 0) {
      return res.status(200).json({ success: true, data: [], message: 'No items found' })
    }

    // Expect si_items to be JSON stored as string
    const payload = items.map((it) => {
      try {
        const parsed = typeof it.si_items === 'string' ? JSON.parse(it.si_items) : it.si_items
        return parsed
      } catch (err) {
        return []
      }
    })

    // If multiple rows exist take the first
    const rows = Array.isArray(payload[0]) ? payload[0] : payload.flat()

    return res.status(200).json({ success: true, data: rows })
  } catch (error) {
    console.error('Error fetching statement items:', error)
    return res.status(500).json({ success: false, message: 'Server error', error: error.message })
  }
}

module.exports = {
  getStatements,
  getStatement,
  createStatement,
  updateStatement,
  saveStatementItems,
  getStatementItems,
}
