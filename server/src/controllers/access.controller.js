require('dotenv').config()
const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/model/Master')

const sql = new SQLQueryBuilder()

const getAccess = async (req, res, next) => {
  try {
    const { sql: query, bindings } = sql
      .select([
        { col: Master.master_access.selectOptionColumns.access_id, as: 'access_id' },
        { col: Master.master_access.selectOptionColumns.access_name, as: 'name' },
        { col: Master.master_access.selectOptionColumns.status, as: 'status' },
      ])
      .from(Master.master_access.tablename)
      .build()

    const accesses = await Query(query, bindings)

    return res.status(200).json({
      success: true,
      message: 'Accesses retrieved successfully',
      data: accesses,
      count: accesses.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching accesses:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching accesses',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const createAccess = async (req, res, next) => {
  try {
    const { access_name, description, status } = req.body

    if (!access_name || !status) {
      return res.status(400).json({
        success: false,
        message: 'Access name and status are required',
      })
    }

    const insertAccessQuery = sql
      .insert(
        Master.master_access.tablename,
        { name: access_name, status },
        { prefix: Master.master_access.prefix },
      )
      .build()

    const insertResult = await Query(insertAccessQuery.sql, insertAccessQuery.bindings)
    const newAccessId = insertResult.insertId

    if (!newAccessId) {
      throw new Error('Failed to create access')
    }

    return res.status(201).json({
      success: true,
      message: 'Access created successfully',
      data: {
        access_id: newAccessId,
        access_name,
        description,
        status,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error creating access:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while creating access',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const updateAccess = async (req, res, next) => {
  try {
    const accessId = Number(req.params.id)
    const { access_name, status } = req.body

    if (!accessId || !access_name || !status) {
      return res.status(400).json({
        success: false,
        message: 'Access id, name, and status are required',
      })
    }

    const updateQuery = sql
      .update(
        Master.master_access.tablename,
        { access_name, status },
        { prefix: Master.master_access.prefix },
      )
      .where(Master.master_access.selectOptionColumns.access_id, accessId)
      .build()

    const updateResult = await Query(updateQuery.sql, updateQuery.bindings)

    if (!updateResult.affectedRows) {
      return res.status(404).json({
        success: false,
        message: 'Access record not found',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Access updated successfully',
      data: {
        id: accessId,
        access_name,
        status,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error updating access:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while updating access',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

module.exports = {
  getAccess,
  createAccess,
  updateAccess,
}
