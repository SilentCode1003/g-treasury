require('dotenv').config()
const { Query, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/model/Master')

const sql = new SQLQueryBuilder()

const getStores = async (req, res, next) => {
  try {
    const { sql: query, bindings } = sql
      .select([
        { col: Master.master_store.selectOptionColumns.id, as: 'store_id' },
        { col: Master.master_store.selectOptionColumns.number, as: 'number' },
        { col: Master.master_store.selectOptionColumns.name, as: 'name' },
        { col: Master.master_store.selectOptionColumns.region, as: 'region' },
        { col: Master.master_store.selectOptionColumns.city_province, as: 'city_province' },
        { col: Master.master_store.selectOptionColumns.status, as: 'status' },
      ])
      .from(Master.master_store.tablename)
      .build()

    const stores = await Query(query, bindings)

    return res.status(200).json({
      success: true,
      message: 'Stores retrieved successfully',
      data: stores,
      count: stores.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching stores:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching stores',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const createStore = async (req, res, next) => {
  try {
    const { number, name, region, city_province, status } = req.body
    const effectiveStatus = status || 'ACTIVE'

    if (!number || !name) {
      return res.status(400).json({
        success: false,
        message: 'Store number and name are required',
      })
    }

    const insertQuery = sql
      .insert(
        Master.master_store.tablename,
        {
          number,
          name,
          region: region || null,
          city_province: city_province || null,
          status: effectiveStatus,
        },
        { prefix: Master.master_store.prefix },
      )
      .build()

    const result = await Query(insertQuery.sql, insertQuery.bindings)

    const { sql: selectSql, bindings: selectBindings } = sql
      .select([
        { col: Master.master_store.selectOptionColumns.id, as: 'store_id' },
        { col: Master.master_store.selectOptionColumns.number, as: 'number' },
        { col: Master.master_store.selectOptionColumns.name, as: 'name' },
        { col: Master.master_store.selectOptionColumns.region, as: 'region' },
        { col: Master.master_store.selectOptionColumns.city_province, as: 'city_province' },
        { col: Master.master_store.selectOptionColumns.status, as: 'status' },
      ])
      .from(Master.master_store.tablename)
      .where(Master.master_store.selectOptionColumns.id, result.insertId)
      .build()

    const [createdStore] = await Query(selectSql, selectBindings)

    return res.status(201).json({
      success: true,
      message: 'Store created successfully',
      data: createdStore || {
        store_id: result.insertId,
        number,
        name,
        region,
        city_province,
        status: effectiveStatus,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error creating store:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while creating store',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const updateStore = async (req, res, next) => {
  try {
    const storeId = Number(req.params.id)
    const { number, name, region, city_province, status } = req.body

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'Store id is required',
      })
    }

    const updateData = {}
    if (number !== undefined) updateData.number = number
    if (name !== undefined) updateData.name = name
    if (region !== undefined) updateData.region = region
    if (city_province !== undefined) updateData.city_province = city_province
    if (status !== undefined) updateData.status = status

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one field is required to update',
      })
    }

    const updateQuery = sql
      .update(Master.master_store.tablename, updateData, { prefix: Master.master_store.prefix })
      .where(Master.master_store.selectOptionColumns.id, storeId)
      .build()

    const result = await Query(updateQuery.sql, updateQuery.bindings)

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: 'Store not found',
      })
    }

    const { sql: selectSql, bindings: selectBindings } = sql
      .select([
        { col: Master.master_store.selectOptionColumns.id, as: 'store_id' },
        { col: Master.master_store.selectOptionColumns.number, as: 'number' },
        { col: Master.master_store.selectOptionColumns.name, as: 'name' },
        { col: Master.master_store.selectOptionColumns.region, as: 'region' },
        { col: Master.master_store.selectOptionColumns.city_province, as: 'city_province' },
        { col: Master.master_store.selectOptionColumns.status, as: 'status' },
      ])
      .from(Master.master_store.tablename)
      .where(Master.master_store.selectOptionColumns.id, storeId)
      .build()

    const [updatedStore] = await Query(selectSql, selectBindings)

    return res.status(200).json({
      success: true,
      message: 'Store updated successfully',
      data: updatedStore || {
        store_id: storeId,
        ...updateData,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error updating store:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while updating store',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

module.exports = {
  getStores,
  createStore,
  updateStore,
}
