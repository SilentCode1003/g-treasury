require('dotenv').config()
const { Query, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/model/Master')
const { EncryptString } = require('../utilities/cryptography.util')

const sql = new SQLQueryBuilder()
const employeeIdColumn = Master.master_user.selectOptionColumns.employee_id || 'mu_employee_id'

const getUsers = async (req, res, next) => {
  try {
    const { sql: query, bindings } = sql
      .select([
        { col: Master.master_user.selectOptionColumns.id, as: 'user_id' },
        { col: Master.master_user.selectOptionColumns.id, as: 'id' },
        { col: employeeIdColumn, as: 'employee_id' },
        { col: Master.master_user.selectOptionColumns.fullname, as: 'fullname' },
        { col: Master.master_user.selectOptionColumns.username, as: 'username' },
        { col: Master.master_user.selectOptionColumns.password, as: 'password' },
        { col: Master.master_user.selectOptionColumns.access_id, as: 'access_id' },
        { col: Master.master_user.selectOptionColumns.status, as: 'status' },
      ])
      .from(Master.master_user.tablename)
      .build()

    const users = await Query(query, bindings)

    return res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: users,
      count: users.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const createUser = async (req, res, next) => {
  try {
    const { employee_id, fullname, username, password, access_id, status } = req.body

    if (!employee_id || !fullname || !username || !password || !access_id) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, full name, username, password, and access level are required',
      })
    }

    // Encrypt the password before storing
    const encryptedPassword = EncryptString(password)

    const insertQuery = sql
      .insert(
        Master.master_user.tablename,
        {
          [employeeIdColumn]: employee_id,
          fullname,
          username,
          password: encryptedPassword,
          access_id,
          status: status || 'ACTIVE',
        },
        { prefix: Master.master_user.prefix },
      )
      .build()

    const result = await Query(insertQuery.sql, insertQuery.bindings)

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user_id: result.insertId,
        employee_id,
        fullname,
        username,
        password: encryptedPassword,
        access_id,
        status: status || 'ACTIVE',
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while creating user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const updateUser = async (req, res, next) => {
  try {
    const userId = Number(req.params.id)
    const { employee_id, fullname, username, password, access_id, status } = req.body

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User id is required',
      })
    }

    const updateData = {}
    if (employee_id !== undefined) updateData[employeeIdColumn] = employee_id
    if (fullname !== undefined) updateData.fullname = fullname
    if (username !== undefined) updateData.username = username
    if (password !== undefined) updateData.password = EncryptString(password)
    if (access_id !== undefined) updateData.access_id = access_id
    if (status !== undefined) updateData.status = status

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one field is required to update',
      })
    }

    const updateQuery = sql
      .update(Master.master_user.tablename, updateData, { prefix: Master.master_user.prefix })
      .where(Master.master_user.selectOptionColumns.id, userId)
      .build()

    const result = await Query(updateQuery.sql, updateQuery.bindings)

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        user_id: userId,
        ...updateData,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while updating user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

module.exports = {
  getUsers,
  createUser,
  updateUser,
}
