import ExcelJS from 'exceljs'
import logo from '../../../assets/logo.png'
import {
  buildContactLine,
  expandRowsForExport,
  formatDateLabel,
  getPartsColumnKeys,
  hasPartsColumns,
  isNumericColumn,
  isRowNumberColumn,
  parseDecimalInput,
} from './Statementformatters'

const tableBorder = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
}

const toDataUrl = async (source) => {
  const response = await fetch(source)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

const rawCellValue = (row, column, rowIndex) => {
  if (isRowNumberColumn(column)) return rowIndex + 1
  const value = row.values?.[column.key]
  const header = String(column.header || '')
    .trim()
    .toLowerCase()

  if (/store\s*(no|number)/i.test(header) && /^\d+(?:\.0+)?$/.test(String(value ?? '').trim())) {
    return Number(value)
  }

  if (column?.serviceMeta) {
    return value === true || value === 'true' || value === 'X' ? 'X' : ''
  }

  if (typeof value === 'string' && value.trim().startsWith('=')) {
    return { formula: value.trim().slice(1) }
  }

  if (isNumericColumn(column) && value !== '' && value !== null && value !== undefined) {
    const parsed = parseDecimalInput(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return value ?? ''
}

const styleCell = (
  cell,
  { bold = false, fill, number = false, align = 'center', fontSize = 11 } = {},
) => {
  cell.font = { name: 'Calibri', size: fontSize, bold, color: { argb: 'FF000000' } }
  cell.alignment = { vertical: 'middle', horizontal: align, wrapText: true }
  cell.border = tableBorder
  if (fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }
  if (number) cell.numFmt = '#,##0.00'
}

export const exportStatementToExcel = async ({
  columns,
  rows,
  documentMeta = {},
  statementId,
  filename,
  totals = {},
}) => {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('SOA')
  worksheet.views = [{ state: 'normal', showGridLines: true }]
  worksheet.properties.showGridLines = true

  const tableColumnOffset = 1
  const tableColumnCount = Math.max(columns.length, 4)
  const colCount = tableColumnCount + tableColumnOffset
  const lastColumnLetter = worksheet.getColumn(colCount).letter
  const expandedRows = expandRowsForExport(rows, columns)

  // Configure column default widths
  worksheet.columns = new Array(colCount).fill(null).map(() => ({ width: 15 }))
  worksheet.getColumn(1).width = 3
  columns.forEach((column, index) => {
    const header = String(column.header || '')
      .trim()
      .toLowerCase()
    const worksheetColumn = worksheet.getColumn(index + 1 + tableColumnOffset)

    if (/store\s*name/i.test(header)) {
      worksheetColumn.width = 28
    } else if (/store\s*(no|number)/i.test(header)) {
      worksheetColumn.width = 12
    } else if (/^(no\.?|row\s*no)$/i.test(header)) {
      worksheetColumn.width = 6
    } else if (/^(date|dr\s*no\.?|rt\s*no\.?)$/i.test(header)) {
      worksheetColumn.width = 14
    }
  })
  worksheet.getColumn(colCount).width = 18

  // Embed Logo Image
  try {
    const imageId = workbook.addImage({ base64: await toDataUrl(logo), extension: 'png' })
    worksheet.addImage(imageId, { tl: { col: 1.05, row: 0.5 }, ext: { width: 110, height: 75 } })
  } catch (error) {
    // Keep export usable if logo fails
  }

  // Set Company Information Header Block
  const from = documentMeta.fromCompany || {}
  const to = documentMeta.toCompany || {}

  let currentRow = 1

  // Helper to safely write unmerged single text rows for address details
  const writeHeaderRow = (rowNum, text, { size = 10, bold = false } = {}) => {
    const cell = worksheet.getCell(`D${rowNum}`)
    cell.value = text
    cell.font = { name: 'Calibri', size, bold, color: { argb: 'FF000000' } }
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false }
    worksheet.getRow(rowNum).height = 18
  }

  // --- FROM BLOCK ---
  writeHeaderRow(
    currentRow,
    `From: ${from.name || '5L SOLUTIONS SUPPLY AND ALLIED SERVICES CORP.'}`,
    { size: 11, bold: true },
  )
  currentRow++

  const fromAddressLines = (
    from.address ||
    'Block 57 Lot 1 Phase 3B Macaria Ave., Pacita 1\nBrgy San Francisco, Biñan City, Laguna'
  )
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  fromAddressLines.forEach((line) => {
    writeHeaderRow(currentRow, line, { size: 10, bold: true })
    currentRow++
  })

  const fromContact = buildContactLine(from) || 'Tel. (02) 8709 9896'
  if (fromContact) {
    writeHeaderRow(currentRow, fromContact, { size: 10, bold: true })
    currentRow++
  }

  currentRow++ // Gap line

  // --- TO BLOCK ---
  writeHeaderRow(currentRow, `To: ${to.name || 'PHILIPPINE SEVEN CORPORATION'}`, {
    size: 11,
    bold: true,
  })
  currentRow++

  const toAddressLines = (
    to.address ||
    '7TH FLR. THE COLUMBIA TOWER BLDG. ORTIGAS AVE. WACK-WACK GREENHILLS\nCITY OF MANDALUYONG NCR SECOND DISTRICT 1550 PHILS.'
  )
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  toAddressLines.forEach((line) => {
    writeHeaderRow(currentRow, line, { size: 10, bold: true })
    currentRow++
  })

  // Date Field placed aligned to the right on the last line of the "To" block
  const dateRow = currentRow - 1
  const dateLabelColLetter = worksheet.getColumn(Math.max(colCount - 2, 1)).letter

  worksheet.getCell(`${dateLabelColLetter}${dateRow}`).value = 'Date:'
  worksheet.getCell(`${dateLabelColLetter}${dateRow}`).font = {
    name: 'Calibri',
    size: 12,
    bold: true,
  }
  worksheet.getCell(`${dateLabelColLetter}${dateRow}`).alignment = {
    horizontal: 'right',
    vertical: 'middle',
  }

  const formattedDate =
    formatDateLabel(documentMeta.date) || documentMeta.date || 'September 7, 2026'
  worksheet.getCell(`${lastColumnLetter}${dateRow}`).value = formattedDate
  worksheet.getCell(`${lastColumnLetter}${dateRow}`).font = {
    name: 'Calibri',
    size: 12,
    bold: true,
  }
  worksheet.getCell(`${lastColumnLetter}${dateRow}`).alignment = {
    horizontal: 'center',
    vertical: 'middle',
  }

  currentRow += 1 // Gap before statement title

  // Statement Title Header Section
  const titleRow = currentRow
  const tableHeaderRow = titleRow + 3

  const firstTableColumnLetter = worksheet.getColumn(1 + tableColumnOffset).letter
  worksheet.mergeCells(`${firstTableColumnLetter}${titleRow}:${lastColumnLetter}${titleRow}`)
  const titleCell = worksheet.getCell(`${firstTableColumnLetter}${titleRow}`)
  titleCell.value = (documentMeta.title || 'STATEMENT OF ACCOUNT FOR PUNCHLISTING').toUpperCase()
  titleCell.font = { name: 'Calibri', size: 11, bold: true }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  titleCell.border = tableBorder

  // Dynamic Table Headers
  columns.forEach((column, index) => {
    const cell = worksheet.getRow(tableHeaderRow).getCell(index + 1 + tableColumnOffset)
    cell.value = String(column.header || column.key).toUpperCase()
    styleCell(cell, { bold: true, fill: 'FFE0E0E0', fontSize: 10 })
  })

  // Dynamic Data Rows Population
  expandedRows.forEach((row, rowIndex) => {
    const currentRowNumber = tableHeaderRow + 1 + rowIndex
    columns.forEach((column, columnIndex) => {
      const cell = worksheet.getRow(currentRowNumber).getCell(columnIndex + 1 + tableColumnOffset)
      const value = rawCellValue(row, column, rowIndex)

      cell.value = value && value.formula ? value : value

      const isNumber = typeof value === 'number'
      const isRowNo = isRowNumberColumn(column)
      const isStoreNo = /store\s*(no|number)/i.test(String(column.header || ''))

      styleCell(cell, {
        number: isNumber && !isStoreNo,
        align: 'center',
        fontSize: 10,
      })

      if (isRowNo) {
        cell.numFmt = '0'
      } else if (isStoreNo) {
        cell.numFmt = '#,##0.00'
      }
    })
  })

  // Totals & Calculations Setup
  const firstDataRow = tableHeaderRow + 1
  const lastDataRow = Math.max(firstDataRow, tableHeaderRow + expandedRows.length - 1)
  const partsKeys = hasPartsColumns(columns) ? getPartsColumnKeys(columns) : null
  const totalColumnIndex = columns.findIndex((column) =>
    /total sales|total amount|total invoice amount/i.test(String(column.header || '')),
  )
  const subtotalColumnIndex = partsKeys?.subtotal
    ? columns.findIndex((column) => column.key === partsKeys.subtotal)
    : totalColumnIndex !== -1
      ? totalColumnIndex
      : Math.max(columns.length - 2, 0)

  const sumColumnLetter = worksheet.getColumn(subtotalColumnIndex + 1 + tableColumnOffset).letter
  const sumRange = `${sumColumnLetter}${firstDataRow}:${sumColumnLetter}${lastDataRow}`

  const valueColumnLetter = worksheet.getColumn(tableColumnCount + tableColumnOffset).letter
  const labelColumnLetter = worksheet.getColumn(tableColumnCount - 1 + tableColumnOffset).letter

  const subtotalRow = lastDataRow + 1
  const vatRow = subtotalRow + 1
  const totalRow = vatRow + 1

  const writeTotalRow = (rowNumber, label, formula, result, bold = false) => {
    const labelCell = worksheet.getCell(`${labelColumnLetter}${rowNumber}`)
    const valueCell = worksheet.getCell(`${valueColumnLetter}${rowNumber}`)
    labelCell.value = label
    valueCell.value = { formula, result: Number(result || 0) }
    styleCell(labelCell, { bold, align: 'left', fontSize: 10 })
    styleCell(valueCell, { bold, number: true, align: 'right', fontSize: 10 })
  }

  const subtotalValue = Number(totals.subTotal || 0)
  const vatValue = Number(totals.vat || 0)
  const totalValue = Number(totals.total || subtotalValue + vatValue)

  writeTotalRow(subtotalRow, 'TOTAL SALES:', `SUM(${sumRange})`, subtotalValue, true)
  writeTotalRow(
    vatRow,
    '12% VAT:',
    `ROUND(${valueColumnLetter}${subtotalRow}*12%,2)`,
    vatValue,
    true,
  )
  writeTotalRow(
    totalRow,
    'TOTAL PROJECT COST:',
    `${valueColumnLetter}${subtotalRow}+${valueColumnLetter}${vatRow}`,
    totalValue,
    true,
  )

  // Row Height Configurations
  worksheet.getRow(titleRow).height = 24
  worksheet.getRow(tableHeaderRow).height = 36

  // Signature Section
  const storeNameColumnIndex = columns.findIndex((column) =>
    /store\s*name/i.test(String(column.header || '')),
  )
  const signatureRow = totalRow + 3
  const preparedStartIndex =
    (storeNameColumnIndex >= 0 ? storeNameColumnIndex + 1 : 4) + tableColumnOffset
  const receivedStartIndex = Math.min(preparedStartIndex + 3, Math.max(1, colCount - 3))
  const preparedStart = worksheet.getColumn(preparedStartIndex).letter
  const preparedEnd = worksheet.getColumn(Math.min(preparedStartIndex + 1, colCount)).letter
  const receivedStart = worksheet.getColumn(receivedStartIndex).letter
  const receivedEnd = worksheet.getColumn(Math.min(receivedStartIndex + 1, colCount)).letter

  worksheet.mergeCells(`${preparedStart}${signatureRow}:${preparedEnd}${signatureRow}`)
  worksheet.mergeCells(`${receivedStart}${signatureRow}:${receivedEnd}${signatureRow}`)
  worksheet.getCell(`${preparedStart}${signatureRow}`).value = 'Prepared By:'
  worksheet.getCell(`${receivedStart}${signatureRow}`).value = 'Received By:'

  ;[`${preparedStart}${signatureRow}`, `${receivedStart}${signatureRow}`].forEach((cellAddr) => {
    worksheet.getCell(cellAddr).font = { name: 'Calibri', size: 12, bold: true }
    worksheet.getCell(cellAddr).alignment = { horizontal: 'center', vertical: 'middle' }
  })

  const signatureLineRow = signatureRow + 2
  worksheet.mergeCells(`${preparedStart}${signatureLineRow}:${preparedEnd}${signatureLineRow}`)
  const prepLine = worksheet.getCell(`${preparedStart}${signatureLineRow}`)
  prepLine.border = { bottom: { style: 'medium', color: { argb: 'FF000000' } } }

  worksheet.mergeCells(`${receivedStart}${signatureLineRow}:${receivedEnd}${signatureLineRow}`)
  worksheet.recLine = worksheet.getCell(`${receivedStart}${signatureLineRow}`)
  worksheet.recLine.border = { bottom: { style: 'medium', color: { argb: 'FF000000' } } }

  // Export File Processing
  const safeName =
    String(filename || `statement-${statementId || 'export'}`)
      .replace(/[\\/:*?"<>|]/g, '')
      .trim() || `statement-${statementId || 'export'}`
  const finalName = safeName.toLowerCase().endsWith('.xlsx') ? safeName : `${safeName}.xlsx`

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = finalName
  link.click()
  URL.revokeObjectURL(url)
}
