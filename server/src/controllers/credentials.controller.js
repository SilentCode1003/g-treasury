require('dotenv').config()
const jwt = require('jsonwebtoken')
const { Query, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/model/Master')
const { DecryptString, EncryptString } = require('../utilities/cryptography.util')


const sql = new SQLQueryBuilder()

const login = async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      })
    }

    
    const { sql: userSql, bindings: userBindings } = sql
      .select([
        { col: Master.master_user.selectOptionColumns.id, as: 'id' },
        { col: Master.master_user.selectOptionColumns.fullname, as: 'fullname' },
        { col: Master.master_user.selectOptionColumns.username, as: 'username' },
        { col: Master.master_user.selectOptionColumns.password, as: 'password' },
        { col: Master.master_user.selectOptionColumns.access_id, as: 'access_id' },
        { col: Master.master_user.selectOptionColumns.status, as: 'status' },
      ])
      .from(Master.master_user.tablename)
      .where(Master.master_user.selectOptionColumns.username, username)
      .build()

    const [user] = await Query(userSql, userBindings)

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      })
    }

    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      })
    }

    if (String(user.status).toLowerCase() !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive',
      })
    }

    const decryptedPassword = DecryptString(user.password)
    if (password !== decryptedPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      })
    }

    const jwtSecret = process.env.SECRET_KEY || process.env._SECRET_KEY
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        fullname: user.fullname,
        access_id: user.access_id,
        status: user.status,
      },
      jwtSecret,
      { expiresIn: '24h' },
    )

    req.session.user = {
      id: user.id,
      username: user.username,
      fullname: user.fullname,
      access_id: user.access_id,
      status: user.status,
    }

    req.session.jwt = token

    const { sql: accessSql, bindings: accessBindings } = sql
      .select([
        { col: Master.master_route_access.selectOptionColumns.name, as: 'name' },
        { col: Master.master_route_access.selectOptionColumns.status, as: 'status' },
      ])
      .from(Master.master_route_access.tablename)
      .where(Master.master_route_access.selectOptionColumns.access_id, user.access_id)
      .build()

    const accessRoutes = await Query(accessSql, accessBindings)

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      data: {
        id: user.id,
        username: user.username,
        fullname: user.fullname,
        access_id: user.access_id,
        status: user.status,
        routes: accessRoutes,
      },
    })
  } catch (error) {
    console.error('Error during login:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: err,
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Logout successful',
    })
  })
}

module.exports = {
  login,
  logout,
}
