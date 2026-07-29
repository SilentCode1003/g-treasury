require('dotenv').config()
const { Query, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/model/Master')

const sql = new SQLQueryBuilder()

const getCompanies = async (req, res, next) => {
  try {
    const { sql: query, bindings } = sql
      .select([
        { col: Master.master_company.selectOptionColumns.company_id, as: 'mc_id' },
        { col: Master.master_company.selectOptionColumns.name, as: 'mc_name' },
        { col: Master.master_company.selectOptionColumns.address, as: 'mc_address' },
        { col: Master.master_company.selectOptionColumns.email, as: 'mc_email' },
        { col: Master.master_company.selectOptionColumns.mobile_number, as: 'mc_mobile_number' },
        {
          col: Master.master_company.selectOptionColumns.telephone_number,
          as: 'mc_telephone_number',
        },
        { col: Master.master_company.selectOptionColumns.tin, as: 'mc_tin' },
        { col: Master.master_company.selectOptionColumns.details, as: 'mc_details' },
        { col: Master.master_company.selectOptionColumns.type, as: 'mc_type' },
      ])
      .from(Master.master_company.tablename)
      .build()

    const companies = await Query(query, bindings)

    return res.status(200).json({
      success: true,
      message: 'Companies retrieved successfully',
      data: companies,
      count: companies.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching companies:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching companies',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const createCompany = async (req, res, next) => {
  try {
    const { name, address, email, mobile_number, telephone_number, tin, details, type } = req.body

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Company name and type are required',
      })
    }

    const insertQuery = sql
      .insert(
        Master.master_company.tablename,
        {
          name,
          address: address || null,
          email: email || null,
          mobile_number: mobile_number || null,
          telephone_number: telephone_number || null,
          tin: tin || null,
          details: details || null,
          type,
        },
        { prefix: Master.master_company.prefix },
      )
      .build()

    const result = await Query(insertQuery.sql, insertQuery.bindings)

    // Fetch the newly created record to return full fields
    const fetchSql = new SQLQueryBuilder()
      .select([
        { col: Master.master_company.selectOptionColumns.company_id, as: 'mc_id' },
        { col: Master.master_company.selectOptionColumns.name, as: 'mc_name' },
        { col: Master.master_company.selectOptionColumns.address, as: 'mc_address' },
        { col: Master.master_company.selectOptionColumns.email, as: 'mc_email' },
        { col: Master.master_company.selectOptionColumns.mobile_number, as: 'mc_mobile_number' },
        {
          col: Master.master_company.selectOptionColumns.telephone_number,
          as: 'mc_telephone_number',
        },
        { col: Master.master_company.selectOptionColumns.tin, as: 'mc_tin' },
        { col: Master.master_company.selectOptionColumns.details, as: 'mc_details' },
        { col: Master.master_company.selectOptionColumns.type, as: 'mc_type' },
      ])
      .from(Master.master_company.tablename)
      .where(Master.master_company.selectOptionColumns.company_id, result.insertId)
      .build()

    const rows = await Query(fetchSql.sql, fetchSql.bindings)
    const created =
      rows && rows.length
        ? rows[0]
        : {
            mc_id: result.insertId,
            mc_name: name,
            mc_address: address || null,
            mc_email: email || null,
            mc_mobile_number: mobile_number || null,
            mc_telephone_number: telephone_number || null,
            mc_tin: tin || null,
            mc_details: details || null,
            mc_type: type,
          }

    return res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: created,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error creating company:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while creating company',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const updateCompany = async (req, res, next) => {
  try {
    const companyId = Number(req.params.id)
    const { name, address, email, mobile_number, telephone_number, tin, details, type } = req.body

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company id is required',
      })
    }

    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (address !== undefined) updateData.address = address
    if (email !== undefined) updateData.email = email
    if (mobile_number !== undefined) updateData.mobile_number = mobile_number
    if (telephone_number !== undefined) updateData.telephone_number = telephone_number
    if (tin !== undefined) updateData.tin = tin
    if (details !== undefined) updateData.details = details
    if (type !== undefined) updateData.type = type

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one field is required to update',
      })
    }

    const updateQuery = sql
      .update(Master.master_company.tablename, updateData, { prefix: Master.master_company.prefix })
      .where(Master.master_company.selectOptionColumns.company_id, companyId)
      .build()

    const result = await Query(updateQuery.sql, updateQuery.bindings)

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      })
    }

    // Fetch the updated record and return full mc_* aliased row
    const fetchSql = new SQLQueryBuilder()
      .select([
        { col: Master.master_company.selectOptionColumns.company_id, as: 'mc_id' },
        { col: Master.master_company.selectOptionColumns.name, as: 'mc_name' },
        { col: Master.master_company.selectOptionColumns.address, as: 'mc_address' },
        { col: Master.master_company.selectOptionColumns.email, as: 'mc_email' },
        { col: Master.master_company.selectOptionColumns.mobile_number, as: 'mc_mobile_number' },
        {
          col: Master.master_company.selectOptionColumns.telephone_number,
          as: 'mc_telephone_number',
        },
        { col: Master.master_company.selectOptionColumns.tin, as: 'mc_tin' },
        { col: Master.master_company.selectOptionColumns.details, as: 'mc_details' },
        { col: Master.master_company.selectOptionColumns.type, as: 'mc_type' },
      ])
      .from(Master.master_company.tablename)
      .where(Master.master_company.selectOptionColumns.company_id, companyId)
      .build()

    const rows = await Query(fetchSql.sql, fetchSql.bindings)
    const updated = rows && rows.length ? rows[0] : { mc_id: companyId, ...updateData }

    return res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      data: updated,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error updating company:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while updating company',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

module.exports = {
  getCompanies,
  createCompany,
  updateCompany,
}
