require('dotenv').config()
const { Query, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/model/Master')
const ExcelJS = require('exceljs')
const path = require('path')
const fs = require('fs')

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

const downloadTemplate = async (req, res, next) => {
  try {
    const templatePath = path.join(__dirname, '../../config/Store Structure.xlsx')

    // Check if file exists
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({
        success: false,
        message: 'Template file not found',
      })
    }

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    res.setHeader('Content-Disposition', 'attachment; filename="Store_Import_Template.xlsx"')

    // Send the file
    const fileStream = fs.createReadStream(templatePath)
    fileStream.pipe(res)

    fileStream.on('error', (error) => {
      console.error('Error streaming template file:', error)
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error sending template file',
          error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        })
      }
    })
  } catch (error) {
    console.error('Error downloading template:', error)
    return res.status(500).json({
      success: false,
      message: 'Error downloading template',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

const uploadStores = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      })
    }

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(req.file.buffer)
    const ws = workbook.worksheets[0]

    if (!ws) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Excel format',
      })
    }

    const headerRow = ws.getRow(1)
    const headers = {}
    headerRow.eachCell((cell, colNumber) => {
      headers[cell.value?.toString().trim()] = colNumber
    })

    const requiredCols = ['STORE NO', 'STORE NAME', 'REGION', 'CITY PROVINCE', 'STATUS']
    for (const col of requiredCols) {
      if (!headers[col]) {
        return res.status(400).json({
          success: false,
          message: `Missing column: ${col}`,
        })
      }
    }

    // Get all existing stores from database
    const { sql: existingStoresSql, bindings: existingStoresBindings } = sql
      .select([
        { col: Master.master_store.selectOptionColumns.id, as: 'store_id' },
        { col: Master.master_store.selectOptionColumns.number, as: 'number' },
        { col: Master.master_store.selectOptionColumns.status, as: 'status' },
      ])
      .from(Master.master_store.tablename)
      .build()

    const existingStores = await Query(existingStoresSql, existingStoresBindings)
    const existingStoreNumbers = new Set(existingStores.map((s) => s.number))

    // Parse uploaded stores
    const uploadedStores = []
    for (let i = 2; i <= ws.rowCount; i++) {
      const row = ws.getRow(i)
      const store_no = row.getCell(headers['STORE NO']).value
      const store_name = row.getCell(headers['STORE NAME']).value
      const region = row.getCell(headers['REGION']).value
      const city_province = row.getCell(headers['CITY PROVINCE']).value
      const status = row.getCell(headers['STATUS']).value || 'ACTIVE'

      if (!store_no || !store_name) continue

      uploadedStores.push({
        number: store_no,
        name: store_name,
        region,
        city_province,
        status,
      })
    }

    const uploadedStoreNumbers = new Set(uploadedStores.map((s) => s.number))

    let addedCount = 0
    let updatedCount = 0
    let deactivatedCount = 0
    let unchangedCount = 0

    // Process uploaded stores
    for (const store of uploadedStores) {
      const existingStore = existingStores.find((s) => s.number === store.number)

      if (!existingStore) {
        // New store - add it
        const insertQuery = sql
          .insert(
            Master.master_store.tablename,
            {
              number: store.number,
              name: store.name,
              region: store.region || null,
              city_province: store.city_province || null,
              status: store.status,
            },
            { prefix: Master.master_store.prefix },
          )
          .build()

        await Query(insertQuery.sql, insertQuery.bindings)
        addedCount++
      } else {
        // Existing store - check if status needs update
        if (existingStore.status !== store.status) {
          const updateQuery = sql
            .update(
              Master.master_store.tablename,
              {
                name: store.name,
                region: store.region || null,
                city_province: store.city_province || null,
                status: store.status,
              },
              { prefix: Master.master_store.prefix },
            )
            .where(Master.master_store.selectOptionColumns.id, existingStore.store_id)
            .build()

          await Query(updateQuery.sql, updateQuery.bindings)
          updatedCount++
        } else {
          unchangedCount++
        }
      }
    }

    // Deactivate stores that exist in DB but not in upload
    for (const existingStore of existingStores) {
      if (!uploadedStoreNumbers.has(existingStore.number) && existingStore.status === 'ACTIVE') {
        const updateQuery = sql
          .update(
            Master.master_store.tablename,
            { status: 'INACTIVE' },
            { prefix: Master.master_store.prefix },
          )
          .where(Master.master_store.selectOptionColumns.id, existingStore.store_id)
          .build()

        await Query(updateQuery.sql, updateQuery.bindings)
        deactivatedCount++
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Store import completed successfully',
      data: {
        added: addedCount,
        updated: updatedCount,
        deactivated: deactivatedCount,
        unchanged: unchangedCount,
        total_processed: uploadedStores.length,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error uploading stores:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while uploading stores',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
}

module.exports = {
  getStores,
  createStore,
  updateStore,
  downloadTemplate,
  uploadStores,
}
