require('dotenv').config()
const { Query, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/model/Master')

const sql = new SQLQueryBuilder()

const getDepartments = async (req, res, next) => {
  try {
    const { sql: query, bindings } = sql
      .select([
        { col: Master.master_department.selectOptionColumns.id, as: 'department_id' },
        { col: Master.master_department.selectOptionColumns.code, as: 'code' },
        { col: Master.master_department.selectOptionColumns.description, as: 'description' },
        { col: Master.master_department.selectOptionColumns.status, as: 'status' },
      ])
      .from(Master.master_department.tablename)
      .build()

    const departments = await Query(query, bindings)

    return res.status(200).json({
      success: true,
      message: 'Departments retrieved successfully',
      data: departments,
      count: departments.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching departments:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching departments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const createDepartment = async (req, res, next) => {
  try {
    const { code, description, status } = req.body
    const normalizedCode = String(code || '')
      .trim()
      .toUpperCase()

    if (!normalizedCode || !status) {
      return res.status(400).json({
        success: false,
        message: 'Department code and status are required',
      })
    }

    const safeCode = normalizedCode.length > 6 ? normalizedCode.slice(0, 6) : normalizedCode

    const insertQuery = sql
      .insert(
        Master.master_department.tablename,
        {
          code: safeCode,
          description: description || null,
          status,
        },
        { prefix: Master.master_department.prefix },
      )
      .build()

    const result = await Query(insertQuery.sql, insertQuery.bindings)

    const { sql: selectSql, bindings: selectBindings } = sql
      .select([
        { col: Master.master_department.selectOptionColumns.id, as: 'department_id' },
        { col: Master.master_department.selectOptionColumns.code, as: 'code' },
        { col: Master.master_department.selectOptionColumns.description, as: 'description' },
        { col: Master.master_department.selectOptionColumns.status, as: 'status' },
      ])
      .from(Master.master_department.tablename)
      .where(Master.master_department.selectOptionColumns.id, result.insertId)
      .build()

    const [createdDepartment] = await Query(selectSql, selectBindings)

    return res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: createdDepartment || {
        department_id: result.insertId,
        code: safeCode,
        description: description || null,
        status,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error creating department:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while creating department',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const updateDepartment = async (req, res, next) => {
  try {
    const departmentId = Number(req.params.id)
    const { code, description, status } = req.body

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Department id is required',
      })
    }

    const updateData = {}
    if (code !== undefined) updateData.code = code
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one field is required to update',
      })
    }

    const updateQuery = sql
      .update(Master.master_department.tablename, updateData, {
        prefix: Master.master_department.prefix,
      })
      .where(Master.master_department.selectOptionColumns.id, departmentId)
      .build()

    const result = await Query(updateQuery.sql, updateQuery.bindings)

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      })
    }

    const { sql: selectSql, bindings: selectBindings } = sql
      .select([
        { col: Master.master_department.selectOptionColumns.id, as: 'department_id' },
        { col: Master.master_department.selectOptionColumns.code, as: 'code' },
        { col: Master.master_department.selectOptionColumns.description, as: 'description' },
        { col: Master.master_department.selectOptionColumns.status, as: 'status' },
      ])
      .from(Master.master_department.tablename)
      .where(Master.master_department.selectOptionColumns.id, departmentId)
      .build()

    const [updatedDepartment] = await Query(selectSql, selectBindings)

    return res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      data: updatedDepartment || {
        department_id: departmentId,
        ...updateData,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error updating department:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while updating department',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
}
