require('dotenv').config()
const { Query, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/model/Master')

const sql = new SQLQueryBuilder()

const getParts = async (req, res, next) => {
  try {
    const { search } = req.query
    
    let queryBuilder = sql
      .select([
        { col: Master.master_parts.selectOptionColumns.id, as: 'part_id' },
        { col: Master.master_parts.selectOptionColumns.name, as: 'name' },
        { col: Master.master_parts.selectOptionColumns.description, as: 'description' },
        { col: Master.master_parts.selectOptionColumns.price, as: 'price' },
        { col: Master.master_parts.selectOptionColumns.status, as: 'status' },
      ])
      .from(Master.master_parts.tablename)
    
    if (search && search.trim() !== '') {
      queryBuilder = queryBuilder.whereLike(
        Master.master_parts.selectOptionColumns.name,
        `%${search}%`
      ).orWhereLike(
        Master.master_parts.selectOptionColumns.description,
        `%${search}%`
      )
    }
    
    const { sql: query, bindings } = queryBuilder.build()

    const parts = await Query(query, bindings)

    return res.status(200).json({
      success: true,
      message: 'Parts retrieved successfully',
      data: parts,
      count: parts.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching parts:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching parts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const createPart = async (req, res, next) => {
  try {
    const { name, description, price, status } = req.body

    if (!name || !status) {
      return res.status(400).json({
        success: false,
        message: 'Part name and status are required',
      })
    }

    const insertQuery = sql
      .insert(
        Master.master_parts.tablename,
        {
          name,
          description: description || null,
          price: price || null,
          status,
        },
        { prefix: Master.master_parts.prefix },
      )
      .build()

    const result = await Query(insertQuery.sql, insertQuery.bindings)

    const { sql: selectSql, bindings: selectBindings } = sql
      .select([
        { col: Master.master_parts.selectOptionColumns.id, as: 'part_id' },
        { col: Master.master_parts.selectOptionColumns.name, as: 'name' },
        { col: Master.master_parts.selectOptionColumns.description, as: 'description' },
        { col: Master.master_parts.selectOptionColumns.price, as: 'price' },
        { col: Master.master_parts.selectOptionColumns.status, as: 'status' },
      ])
      .from(Master.master_parts.tablename)
      .where(Master.master_parts.selectOptionColumns.id, result.insertId)
      .build()

    const [createdPart] = await Query(selectSql, selectBindings)

    return res.status(201).json({
      success: true,
      message: 'Part created successfully',
      data: createdPart || {
        part_id: result.insertId,
        name,
        description: description || null,
        price: price || null,
        status,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error creating part:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while creating part',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const updatePart = async (req, res, next) => {
  try {
    const partId = Number(req.params.id)
    const { name, description, price, status } = req.body

    if (!partId) {
      return res.status(400).json({
        success: false,
        message: 'Part id is required',
      })
    }

    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (price !== undefined) updateData.price = price
    if (status !== undefined) updateData.status = status

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one field is required to update',
      })
    }

    const updateQuery = sql
      .update(Master.master_parts.tablename, updateData, {
        prefix: Master.master_parts.prefix,
      })
      .where(Master.master_parts.selectOptionColumns.id, partId)
      .build()

    const result = await Query(updateQuery.sql, updateQuery.bindings)

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: 'Part not found',
      })
    }

    const { sql: selectSql, bindings: selectBindings } = sql
      .select([
        { col: Master.master_parts.selectOptionColumns.id, as: 'part_id' },
        { col: Master.master_parts.selectOptionColumns.name, as: 'name' },
        { col: Master.master_parts.selectOptionColumns.description, as: 'description' },
        { col: Master.master_parts.selectOptionColumns.price, as: 'price' },
        { col: Master.master_parts.selectOptionColumns.status, as: 'status' },
      ])
      .from(Master.master_parts.tablename)
      .where(Master.master_parts.selectOptionColumns.id, partId)
      .build()

    const [updatedPart] = await Query(selectSql, selectBindings)

    return res.status(200).json({
      success: true,
      message: 'Part updated successfully',
      data: updatedPart || {
        part_id: partId,
        ...updateData,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error updating part:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while updating part',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

module.exports = {
  getParts,
  createPart,
  updatePart,
}
