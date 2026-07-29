require('dotenv').config()
const mysql = require('mysql2/promise')
const { logger } = require('../../utilities/logger.util')
const CONFIG = require('../config/config')

const pool = mysql.createPool({
  host: CONFIG[process.env.VITE_ENV].host,
  user: CONFIG[process.env.VITE_ENV].username,
  password: CONFIG[process.env.VITE_ENV].password,
  database: CONFIG[process.env.VITE_ENV].database,
  multipleStatements: CONFIG[process.env.VITE_ENV].dialectOptions.multipleStatements,
})

const DataModeling = (data, prefixes) => {
  const prefixArray = Array.isArray(prefixes) ? prefixes : [prefixes]

  return data.map((item) => {
    const newObject = {}

    for (const key in item) {
      if (Object.prototype.hasOwnProperty.call(item, key)) {
        let newKey = key
        let prefixFound = false

        // Try each prefix until we find a match
        for (const prefix of prefixArray) {
          if (key.startsWith(prefix)) {
            newKey = key.replace(prefix, '')
            prefixFound = true
            break
          }
        }

        // If no prefix matched, keep original key
        if (!prefixFound) {
          newKey = key
        }

        newObject[newKey] = item[key]
      }
    }
    return newObject
  })
}

/**
 * @name checkConnection
 * @description Pings the database using a connection from the pool to verify connectivity.
 */
const checkConnection = async () => {
  let conn
  const startTime = process.hrtime()

  try {
    conn = await pool.getConnection()
    await conn.ping()

    const [seconds, nanoseconds] = process.hrtime(startTime)
    const latencyMs = seconds * 1000 + nanoseconds / 1000000

    // logger.info('MySQL database connection established successfully!')

    return {
      status: 'Ok',
      latency: Math.round(latencyMs),
      details: 'Connection and ping successful',
    }
  } catch (err) {
    console.log('Error connection to MySQL database: ', err.message)

    return {
      status: 'Error',
      latency: null,
      details: err.message || 'Unknown database connection error',
    }
  } finally {
    if (conn) {
      conn.release()
    }
  }
}

//@ can be used for universal query SELECT, INSERT, UPDATE, DELETE
const Query = async (sql, params = [], prefixes) => {
  try {
    const [result] = await pool.query(sql, params)

    if (sql.trim().toUpperCase().startsWith('INSERT')) {
      return { ...result, insertId: result.insertId }
    }

    if (prefixes && sql.trim().toUpperCase().startsWith('SELECT')) {
      const data = DataModeling(result, prefixes)
      return data
    }

    return result
  } catch (error) {
    logger.error(error)
    console.error('Error executing query:', error)
    throw error
  }
}

//@use for Transac and Commit
const Transaction = async (queries) => {
  let connection
  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()

    for (const query of queries) {
      await connection.execute(query.sql, query.values)
    }

    await connection.commit()
    return true
  } catch (error) {
    logger.error('Transaction failed:', error)
    console.log(error)
    if (connection) {
      try {
        await connection.rollback()
      } catch (rollbackError) {
        logger.error('Rollback failed after transaction error:', rollbackError)
      }
    }
    throw error
  } finally {
    if (connection) {
      connection.release()
    }
  }
}

class SQLQueryBuilder {
  constructor() {
    this.reset()
    this._allowedOperators = [
      '=',
      '!=',
      '<>',
      '<',
      '<=',
      '>',
      '>=',
      'LIKE',
      'NOT LIKE',
      'IN',
      'NOT IN',
      'IS',
      'IS NOT',
      'BETWEEN',
    ]
  }

  reset() {
    this._query = {
      type: null,
      table: '',
      columns: [],
      joins: [],
      wheres: [],
      orders: [],
      groups: [],
      havings: [],
      limit: null,
      offset: null,
      distinct: false,
      sets: {},
      allowUnsafe: false,
      prefix: '',
    }
    this._bindings = []
    this._model = null
    return this
  }

  model(schema) {
    this._model = schema
    this._query.table = schema.table
    this._query.prefix = schema.prefix || ''
    return this
  }

  unsafe() {
    this._query.allowUnsafe = true
    return this
  }

  select(columns) {
    this._query.type = 'SELECT'

    if (!columns && this._model && this._model.cols) {
      this._query.columns = Object.entries(this._model.cols).map(([key, dbCol]) => {
        return `${dbCol} AS ${key}`
      })
      return this
    }

    const cols = columns ? (Array.isArray(columns) ? columns : [columns]) : ['*']

    this._query.columns = cols.map((col) => {
      if (typeof col === 'object' && col !== null) {
        if (!col.col || !col.as) throw new Error('Select object must contain "col" and "as"')
        return `${col.col} AS ${col.as}`
      }

      if (this._model && this._model.cols) {
        if (this._model.cols[col]) {
          const dbName = this._model.cols[col]
          return `${dbName} AS ${col}`
        }

        const shortKey = Object.keys(this._model.cols).find((key) => this._model.cols[key] === col)
        if (shortKey) {
          return `${col} AS ${shortKey}`
        }
      }

      return this._resolveCol(col)
    })
    return this
  }

  selectAll() {
    return this.select()
  }

  distinct() {
    this._query.distinct = true
    return this
  }

  from(table) {
    if (!table || typeof table !== 'string')
      throw new Error('.from() requires a valid string table name')
    this._query.table = table
    return this
  }

  join(table, first, operator, second, type = 'INNER') {
    if (!table) throw new Error('Join requires a table name')

    let joinOp = operator
    let joinSecond = second
    let joinType = type

    const upperOp = typeof operator === 'string' ? operator.toUpperCase() : ''

    if (!this._allowedOperators.includes(upperOp)) {
      joinSecond = operator
      joinOp = '='
      joinType = second || type
    }

    if (!first || !joinSecond) throw new Error('Join requires left and right columns')

    this._validateOperator(joinOp)

    this._query.joins.push({
      type: joinType,
      table,
      first,
      operator: joinOp,
      second: joinSecond,
    })

    return this
  }

  leftJoin(table, first, operator, second) {
    return this.join(table, first, operator, second, 'LEFT')
  }

  rightJoin(table, first, operator, second) {
    return this.join(table, first, operator, second, 'RIGHT')
  }

  where(column, operator = null, value = null) {
    return this._addWhere('AND', this._resolveCol(column), operator, value)
  }

  orWhere(column, operator = null, value = null) {
    return this._addWhere('OR', this._resolveCol(column), operator, value)
  }

  whereIn(column, values) {
    if (!Array.isArray(values) || values.length === 0)
      throw new Error('.whereIn() requires a non-empty array')
    const placeholders = values.map(() => '?').join(', ')
    return this._addRawWhere('AND', `${this._resolveCol(column)} IN (${placeholders})`, values)
  }

  whereNull(column) {
    return this._addRawWhere('AND', `${this._resolveCol(column)} IS NULL`)
  }

  whereNotNull(column) {
    return this._addRawWhere('AND', `${this._resolveCol(column)} IS NOT NULL`)
  }

  orderBy(column, direction = 'ASC') {
    if (!['ASC', 'DESC'].includes(direction.toUpperCase()))
      throw new Error('Order direction must be ASC or DESC')
    this._query.orders.push(`${this._resolveCol(column)} ${direction.toUpperCase()}`)
    return this
  }

  groupBy(columns) {
    const cols = Array.isArray(columns) ? columns : [columns]
    this._query.groups.push(...cols.map((c) => this._resolveCol(c)))
    return this
  }

  having(column, operator, value) {
    this._validateOperator(operator)
    this._query.havings.push(`${this._resolveCol(column)} ${operator} ${value}`)
    return this
  }

  limit(number) {
    if (number < 0) throw new Error('Limit cannot be negative')
    this._query.limit = number
    return this
  }

  offset(number) {
    if (number < 0) throw new Error('Offset cannot be negative')
    this._query.offset = number
    return this
  }

  forPage(page, perPage = 15) {
    if (page < 1) page = 1
    return this.limit(perPage).offset((page - 1) * perPage)
  }

  insert(arg1, arg2, options = {}) {
    this._query.type = 'INSERT'

    if (
      this._model &&
      ((typeof arg1 === 'object' && !Array.isArray(arg1)) || Array.isArray(arg1))
    ) {
      this._bindings = Array.isArray(arg1) ? arg1 : [arg1]
    } else {
      if (!arg1) throw new Error('.insert() requires a table name')
      this._query.table = arg1
      this._query.prefix = options.prefix || ''
      this._bindings = Array.isArray(arg2) ? arg2 : [arg2]
    }

    if (this._bindings.length === 0) throw new Error('.insert() requires data')
    return this
  }

  update(arg1, arg2, options = {}) {
    this._query.type = 'UPDATE'

    if (this._model && typeof arg1 === 'object') {
      this._query.sets = arg1
    } else {
      if (!arg1) throw new Error('.update() requires a table name')
      this._query.table = arg1
      this._query.prefix = options.prefix || ''
      this._query.sets = arg2
    }

    if (!this._query.sets || Object.keys(this._query.sets).length === 0)
      throw new Error('.update() requires data')
    return this
  }

  delete(table) {
    this._query.type = 'DELETE'
    if (table) this._query.table = table
    return this
  }

  build() {
    try {
      if (!this._query.type) throw new Error('No query type set')

      const { sql: whereSQL, bindings: whereBindings } = this._compileWheres()

      let sql = ''
      let finalBindings = []

      switch (this._query.type) {
        case 'SELECT':
          this._validateSelect()
          sql = this._buildSelect(whereSQL)
          finalBindings = [...whereBindings]
          break
        case 'INSERT':
          const insertResult = this._buildInsert()
          sql = insertResult.sql
          finalBindings = insertResult.bindings
          break
        case 'UPDATE':
          this._validateSafety('UPDATE')
          const updateResult = this._buildUpdate(whereSQL)
          sql = updateResult.sql
          finalBindings = [...updateResult.bindings, ...whereBindings]
          break
        case 'DELETE':
          if (!this._query.table) throw new Error('DELETE requires table name')
          this._validateSafety('DELETE')
          sql = `DELETE FROM ${this._query.table}`
          if (whereSQL) sql += ` WHERE ${whereSQL}`
          finalBindings = [...whereBindings]
          break
      }

      return { sql, bindings: finalBindings }
    } finally {
      this.reset()
    }
  }

  _resolveCol(col) {
    if (col.includes(' ') || col.includes('(') || col.includes('.')) return col

    if (this._model?.cols && this._model.cols[col]) {
      return this._model.cols[col]
    }

    if (this._model?.cols && Object.values(this._model.cols).includes(col)) {
      return col
    }

    if (this._query.prefix) {
      const prefix = this._query.prefix
      if (col.startsWith(`${prefix}_`) || col.startsWith(prefix)) {
        return col
      }

      return `${prefix}_${col}`
    }

    return col
  }

  _validateOperator(operator) {
    if (!operator) return
    const op = operator.toUpperCase()
    if (!this._allowedOperators.includes(op)) {
      throw new Error(`Invalid operator: "${operator}"`)
    }
  }

  _validateSelect() {
    if (!this._query.table) throw new Error('SELECT query requires a table')
  }

  _validateSafety(operation) {
    if (this._query.wheres.length === 0 && !this._query.allowUnsafe) {
      throw new Error(`Unsafe ${operation}: No WHERE clause. Use .unsafe() to override.`)
    }
  }

  _addWhere(bool, column, operator, value) {
    if (value === null && operator !== null) {
      value = operator
      operator = '='
    }

    if (value === null) {
      return operator === '!=' || operator === '<>'
        ? this.whereNotNull(column)
        : this.whereNull(column)
    }

    this._validateOperator(operator)

    this._query.wheres.push({
      bool,
      sql: `${column} ${operator} ?`,
      bindings: [value],
    })
    return this
  }

  _addRawWhere(bool, sql, bindings = []) {
    this._query.wheres.push({ bool, sql, bindings })
    return this
  }

  _buildSelect(whereSQL) {
    const cols = this._query.columns.length ? this._query.columns.join(', ') : '*'
    const distinct = this._query.distinct ? 'DISTINCT ' : ''
    let sql = `SELECT ${distinct}${cols} FROM ${this._query.table}`

    this._query.joins.forEach((j) => {
      sql += ` ${j.type} JOIN ${j.table} ON ${j.first} ${j.operator} ${j.second}`
    })

    if (whereSQL) sql += ` WHERE ${whereSQL}`

    if (this._query.groups.length) sql += ` GROUP BY ${this._query.groups.join(', ')}`
    if (this._query.havings.length) sql += ` HAVING ${this._query.havings.join(' AND ')}`
    if (this._query.orders.length) sql += ` ORDER BY ${this._query.orders.join(', ')}`
    if (this._query.limit) sql += ` LIMIT ${this._query.limit}`
    if (this._query.offset) sql += ` OFFSET ${this._query.offset}`

    return sql
  }

  _buildInsert() {
    const rows = this._bindings
    const keys = Object.keys(rows[0])

    const columns = keys.map((k) => this._resolveCol(k))

    const placeholders = `(${columns.map(() => '?').join(', ')})`
    const sql = `INSERT INTO ${this._query.table} (${columns.join(', ')}) VALUES ${rows.map(() => placeholders).join(', ')}`

    const bindings = []
    rows.forEach((row) => {
      keys.forEach((key) => bindings.push(row[key]))
    })

    return { sql, bindings }
  }

  _buildUpdate(whereSQL) {
    const sets = []
    const bindings = []

    Object.entries(this._query.sets).forEach(([key, value]) => {
      sets.push(`${this._resolveCol(key)} = ?`)
      bindings.push(value)
    })

    let sql = `UPDATE ${this._query.table} SET ${sets.join(', ')}`
    if (whereSQL) sql += ` WHERE ${whereSQL}`

    return { sql, bindings }
  }

  _compileWheres() {
    if (this._query.wheres.length === 0) return { sql: '', bindings: [] }
    const sqlParts = []
    const bindings = []
    this._query.wheres.forEach((w, i) => {
      const prefix = i === 0 ? '' : `${w.bool} `
      sqlParts.push(`${prefix}${w.sql}`)
      bindings.push(...w.bindings)
    })
    return { sql: sqlParts.join(' '), bindings }
  }
}

module.exports = {
  checkConnection,
  Query,
  Transaction,
  SQLQueryBuilder,
}
