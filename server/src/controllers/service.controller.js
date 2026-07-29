require('dotenv').config()
const { Query, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/model/Master')

const sql = new SQLQueryBuilder()

const getServices = async (req, res, next) => {
  try {
    const { sql: query, bindings } = sql
      .select([
        { col: Master.master_service.selectOptionColumns.id, as: 'service_id' },
        { col: Master.master_service.selectOptionColumns.department_id, as: 'department_id' },
        { col: Master.master_service.selectOptionColumns.name, as: 'name' },
        { col: Master.master_service.selectOptionColumns.price, as: 'price' },
        { col: Master.master_service.selectOptionColumns.status, as: 'status' },
        { col: Master.master_department.selectOptionColumns.description, as: 'department_name' },
      ])
      .from(Master.master_service.tablename)
      .leftJoin(
        Master.master_department.tablename,
        Master.master_service.selectOptionColumns.department_id,
        Master.master_department.selectOptionColumns.id,
      )
      .build()

    const services = await Query(query, bindings)

    return res.status(200).json({
      success: true,
      message: 'Services retrieved successfully',
      data: services,
      count: services.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching services:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching services',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const createService = async (req, res, next) => {
  try {
    const { department_id, name, price, status } = req.body

    if (!department_id || !name || !status) {
      return res.status(400).json({
        success: false,
        message: 'Department, name and status are required',
      })
    }

    const insertQuery = sql
      .insert(
        Master.master_service.tablename,
        {
          department_id,
          name,
          price: price || 0.0,
          status,
        },
        { prefix: Master.master_service.prefix },
      )
      .build()

    const result = await Query(insertQuery.sql, insertQuery.bindings)

    const { sql: selectSql, bindings: selectBindings } = sql
      .select([
        { col: Master.master_service.selectOptionColumns.id, as: 'service_id' },
        { col: Master.master_service.selectOptionColumns.department_id, as: 'department_id' },
        { col: Master.master_service.selectOptionColumns.name, as: 'name' },
        { col: Master.master_service.selectOptionColumns.price, as: 'price' },
        { col: Master.master_service.selectOptionColumns.status, as: 'status' },
        { col: Master.master_department.selectOptionColumns.description, as: 'department_name' },
      ])
      .from(Master.master_service.tablename)
      .leftJoin(
        Master.master_department.tablename,
        Master.master_service.selectOptionColumns.department_id,
        Master.master_department.selectOptionColumns.id,
      )
      .where(Master.master_service.selectOptionColumns.id, result.insertId)
      .build()

    const [createdService] = await Query(selectSql, selectBindings)

    return res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: createdService || {
        service_id: result.insertId,
        department_id,
        name,
        price: price || 0.0,
        status,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error creating service:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while creating service',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const updateService = async (req, res, next) => {
  try {
    const serviceId = Number(req.params.id)
    const { department_id, name, price, status } = req.body

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Service id is required',
      })
    }

    const updateData = {}
    if (department_id !== undefined) updateData.department_id = department_id
    if (name !== undefined) updateData.name = name
    if (price !== undefined) updateData.price = price
    if (status !== undefined) updateData.status = status

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one field is required to update',
      })
    }

    const updateQuery = sql
      .update(Master.master_service.tablename, updateData, { prefix: Master.master_service.prefix })
      .where(Master.master_service.selectOptionColumns.id, serviceId)
      .build()

    const result = await Query(updateQuery.sql, updateQuery.bindings)

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      })
    }

    const { sql: selectSql, bindings: selectBindings } = sql
      .select([
        { col: Master.master_service.selectOptionColumns.id, as: 'service_id' },
        { col: Master.master_service.selectOptionColumns.department_id, as: 'department_id' },
        { col: Master.master_service.selectOptionColumns.name, as: 'name' },
        { col: Master.master_service.selectOptionColumns.price, as: 'price' },
        { col: Master.master_service.selectOptionColumns.status, as: 'status' },
        { col: Master.master_department.selectOptionColumns.description, as: 'department_name' },
      ])
      .from(Master.master_service.tablename)
      .leftJoin(
        Master.master_department.tablename,
        Master.master_service.selectOptionColumns.department_id,
        Master.master_department.selectOptionColumns.id,
      )
      .where(Master.master_service.selectOptionColumns.id, serviceId)
      .build()

    const [updatedService] = await Query(selectSql, selectBindings)

    return res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: updatedService || {
        service_id: serviceId,
        ...updateData,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error updating service:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while updating service',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

module.exports = {
  getServices,
  createService,
  updateService,
}
