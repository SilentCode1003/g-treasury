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
  let titleRow = 11
  let tableHeaderRow = 14
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
    worksheet.addImage(imageId, { tl: { col: 1.05, row: 0.8 }, ext: { width: 110, height: 75 } })
  } catch (error) {
    // Keep export usable if logo fails
  }

  // Set Company Information Header Block
  const from = documentMeta.fromCompany || {}
  const to = documentMeta.toCompany || {}

  const storeNameColumnIndex = columns.findIndex((column) =>
    /store\s*name/i.test(String(column.header || '')),
  )
  const headerStartColumn =
    (storeNameColumnIndex >= 0 ? storeNameColumnIndex + 1 : 4) + tableColumnOffset
  const headerEndColumn = Math.max(headerStartColumn, colCount - 3)
  const writeHeaderLine = (rowNumber, value, { size = 10, bold = true } = {}) => {
    const start = worksheet.getColumn(headerStartColumn).letter
    const end = worksheet.getColumn(headerEndColumn).letter
    worksheet.mergeCells(`${start}${rowNumber}:${end}${rowNumber}`)
    const cell = worksheet.getCell(`${start}${rowNumber}`)
    cell.value = value
    cell.font = { name: 'Calibri', size, bold }
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
  }

  const writeCompanyBlock = (
    label,
    company,
    startRow,
    fallbackName,
    fallbackAddress,
    fallbackContact,
  ) => {
    writeHeaderLine(startRow, `${label}: ${company.name || fallbackName}`, { size: 11 })
    const addressLines = String(company.address || fallbackAddress)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    addressLines.forEach((line, index) => writeHeaderLine(startRow + 1 + index, line))
    const contact = buildContactLine(company) || fallbackContact
    if (contact) writeHeaderLine(startRow + 1 + addressLines.length, contact)
    return startRow + addressLines.length + (contact ? 1 : 0)
  }

  writeCompanyBlock(
    'From',
    from,
    1,
    '5L SOLUTIONS SUPPLY AND ALLIED SERVICES CORP.',
    'Block 57 Lot 1 Phase 3B Macaria Ave.\nPacita Complex San Francisco\nBiñan Laguna',
    'Tel. (02) 8709 9896',
  )
  const toEndRow = writeCompanyBlock(
    'To',
    to,
    7,
    'Philippine Seven Corporation',
    '7th Flr. The Columbia Tower Bldg. Ortigas Ave.,\nWack-Wack Greenhills, City of Mandaluyong\nNCR Second District 1550 Phils.',
    '',
  )

  // Date Field sits below the To block to avoid colliding with its details.
  const dateColLetter = worksheet.getColumn(Math.max(colCount - 2, 1)).letter
  const dateRow = toEndRow + 1
  worksheet.getCell(`${dateColLetter}${dateRow}`).value = 'Date:'
  worksheet.getCell(`${dateColLetter}${dateRow}`).font = { name: 'Calibri', size: 12, bold: true }
  worksheet.getCell(`${dateColLetter}${dateRow}`).alignment = { horizontal: 'right' }

  const formattedDate = formatDateLabel(documentMeta.date) || documentMeta.date || 'AUG'
  worksheet.getCell(`${lastColumnLetter}${dateRow}`).value = formattedDate
  worksheet.getCell(`${lastColumnLetter}${dateRow}`).font = {
    name: 'Calibri',
    size: 12,
    bold: true,
  }
  worksheet.getCell(`${lastColumnLetter}${dateRow}`).alignment = { horizontal: 'center' }

  titleRow = Math.max(titleRow, dateRow + 2)
  tableHeaderRow = titleRow + 3

  // Statement Title Header Section
  const firstTableColumnLetter = worksheet.getColumn(1 + tableColumnOffset).letter
  worksheet.mergeCells(`${firstTableColumnLetter}${titleRow}:${lastColumnLetter}${titleRow}`)
  const titleCell = worksheet.getCell(`${firstTableColumnLetter}${titleRow}`)
  titleCell.value =
    documentMeta.title ||
    'Statement of Account For IHW Rectification, Antenna Installation, Telco Migration, Kiosk, and Cable Pulling'
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

      styleCell(cell, {
        number: isNumber,
        align: 'center',
        fontSize: 10,
      })

      if (isRowNo) {
        cell.numFmt = '0'
      }
    })
  })

  // Totals & Calculations Setup
  const firstDataRow = tableHeaderRow + 1
  const lastDataRow = Math.max(firstDataRow, tableHeaderRow + expandedRows.length)
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
  // Prepared By underline
  worksheet.mergeCells(`${preparedStart}${signatureLineRow}:${preparedEnd}${signatureLineRow}`)
  const prepLine = worksheet.getCell(`${preparedStart}${signatureLineRow}`)
  prepLine.border = { bottom: { style: 'medium', color: { argb: 'FF000000' } } }

  // Received By underline
  worksheet.mergeCells(`${receivedStart}${signatureLineRow}:${receivedEnd}${signatureLineRow}`)
  const recLine = worksheet.getCell(`${receivedStart}${signatureLineRow}`)
  recLine.border = { bottom: { style: 'medium', color: { argb: 'FF000000' } } }

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
