require('dotenv').config()
const { Query, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/model/Master')

const sql = new SQLQueryBuilder()

const getRouteAccess = async (req, res, next) => {
  try {
    const { sql: query, bindings } = sql
      .select([
        { col: Master.master_route_access.selectOptionColumns.id, as: 'route_access_id' },
        { col: Master.master_route_access.selectOptionColumns.access_id, as: 'access_id' },
        { col: Master.master_route_access.selectOptionColumns.name, as: 'name' },
        { col: Master.master_route_access.selectOptionColumns.status, as: 'status' },
      ])
      .from(Master.master_route_access.tablename)
      .build()

    const routeAccesses = await Query(query, bindings)

    return res.status(200).json({
      success: true,
      message: 'Route accesses retrieved successfully',
      data: routeAccesses,
      count: routeAccesses.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching route accesses:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching route accesses',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const getRouteAccessByAccessId = async (req, res, next) => {
  try {
    const accessId = Number(req.params.accessId)

    if (!accessId) {
      return res.status(400).json({
        success: false,
        message: 'Access id is required',
      })
    }

    const { sql: query, bindings } = sql
      .select([
        { col: Master.master_route_access.selectOptionColumns.id, as: 'route_access_id' },
        { col: Master.master_route_access.selectOptionColumns.access_id, as: 'access_id' },
        { col: Master.master_route_access.selectOptionColumns.name, as: 'name' },
        { col: Master.master_route_access.selectOptionColumns.status, as: 'status' },
      ])
      .from(Master.master_route_access.tablename)
      .where(Master.master_route_access.selectOptionColumns.access_id, accessId)
      .build()

    const routeAccesses = await Query(query, bindings)

    return res.status(200).json({
      success: true,
      message: 'Route accesses retrieved successfully',
      data: routeAccesses,
      count: routeAccesses.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching route accesses by access id:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching route accesses',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const createRouteAccess = async (req, res, next) => {
  try {
    const { access_id, name, status } = req.body

    if (!access_id || !name || !status) {
      return res.status(400).json({
        success: false,
        message: 'Access id, route name, and status are required',
      })
    }

    const insertQuery = sql
      .insert(
        Master.master_route_access.tablename,
        {
          access_id,
          name,
          status,
        },
        { prefix: Master.master_route_access.prefix },
      )
      .build()

    const result = await Query(insertQuery.sql, insertQuery.bindings)

    return res.status(201).json({
      success: true,
      message: 'Route access created successfully',
      data: {
        route_access_id: result.insertId,
        access_id,
        name,
        status,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error creating route access:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while creating route access',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const updateRouteAccess = async (req, res, next) => {
  try {
    const routeAccessId = Number(req.params.id)
    const { access_id, name, status } = req.body

    if (!routeAccessId) {
      return res.status(400).json({
        success: false,
        message: 'Route access id is required',
      })
    }

    const updateData = {}
    if (access_id !== undefined) updateData.access_id = access_id
    if (name !== undefined) updateData.name = name
    if (status !== undefined) updateData.status = status

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one field is required to update',
      })
    }

    const updateQuery = sql
      .update(Master.master_route_access.tablename, updateData, {
        prefix: Master.master_route_access.prefix,
      })
      .where(Master.master_route_access.selectOptionColumns.id, routeAccessId)
      .build()

    const result = await Query(updateQuery.sql, updateQuery.bindings)

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: 'Route access not found',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Route access updated successfully',
      data: {
        route_access_id: routeAccessId,
        ...updateData,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error updating route access:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while updating route access',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

module.exports = {
  getRouteAccess,
  getRouteAccessByAccessId,
  createRouteAccess,
  updateRouteAccess,
}
