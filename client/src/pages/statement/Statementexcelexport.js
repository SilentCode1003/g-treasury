import ExcelJS from 'exceljs'
import logo from '../../../assets/logo.png'
import {
  buildContactLine,
  formatDateLabel,
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

// Convert column index (0-based) to Excel column letter
const getColumnLetter = (index) => {
  let letter = ''
  let temp = index
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter
    temp = Math.floor(temp / 26) - 1
  }
  return letter
}

// Clean and convert string / numeric inputs into valid floats
const parseNumericValue = (val) => {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return Number.isNaN(val) ? 0 : val
  const cleaned = String(val).replace(/[^0-9.-]+/g, '')
  const num = parseFloat(cleaned)
  return Number.isNaN(num) ? 0 : num
}

// Deep extractor that searches objects, nested .values objects, and stringified JSON
const extractFieldValue = (sourceObj, fallbackObj, keys) => {
  const check = (obj) => {
    if (!obj || typeof obj !== 'object') return undefined

    // 1. Check direct keys
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '' && typeof obj[k] !== 'object') {
        return obj[k]
      }
    }

    // 2. Check inner .values if object is nested
    if (obj.values && typeof obj.values === 'object') {
      for (const k of keys) {
        if (
          obj.values[k] !== undefined &&
          obj.values[k] !== null &&
          obj.values[k] !== '' &&
          typeof obj.values[k] !== 'object'
        ) {
          return obj.values[k]
        }
      }
    }

    return undefined
  }

  let val = check(sourceObj)
  if (val !== undefined) return val

  val = check(fallbackObj)
  if (val !== undefined) return val

  return ''
}

// Safe parser for parts array handling JSON strings, arrays, and objects
const parsePartsArray = (rawParts) => {
  if (!rawParts) return null

  let parts = rawParts

  // Handle stringified JSON
  if (typeof rawParts === 'string') {
    try {
      parts = JSON.parse(rawParts)
    } catch (e) {
      return null
    }
  }

  if (Array.isArray(parts) && parts.length > 0) {
    return parts
  }

  return null
}

// Custom expand function that properly formats single rows and multi-part rows
const processRowsForExport = (rows) => {
  const result = []

  rows.forEach((row) => {
    const rowValues = { ...(row.values || {}), ...row }

    // Check for parts array across row and rowValues
    const parts = parsePartsArray(row.parts) || parsePartsArray(rowValues.parts)

    if (parts && parts.length > 0) {
      parts.forEach((part, index) => {
        const itemValues = { ...rowValues }
        const partObj = typeof part === 'object' ? part : {}

        itemValues.parts_description = extractFieldValue(partObj, rowValues, [
          'parts_description',
          'partsDescription',
          'part_description',
          'partDescription',
          'item_description',
          'parts',
          'description',
        ])

        itemValues.parts_qty = extractFieldValue(partObj, rowValues, [
          'parts_qty',
          'partsQty',
          'parts_quantity',
          'qty',
          'quantity',
          'part_qty',
        ])

        itemValues.price = extractFieldValue(partObj, rowValues, [
          'price',
          'unit_price',
          'unitPrice',
          'cost',
          'rate',
        ])

        const qtyNum = parseNumericValue(itemValues.parts_qty)
        const priceNum = parseNumericValue(itemValues.price)

        const rawSubtotal = extractFieldValue(partObj, rowValues, [
          'subtotal',
          'sub_total',
          'subTotal',
          'amount',
        ])
        const parsedSubtotal = parseNumericValue(rawSubtotal)

        itemValues.subtotal = parsedSubtotal > 0 ? parsedSubtotal : qtyNum * priceNum

        const rawTotalInvoice = extractFieldValue(partObj, rowValues, [
          'total_invoice_amount',
          'totalInvoiceAmount',
          'total_amount',
          'totalAmount',
        ])
        itemValues.total_invoice_amount = parseNumericValue(rawTotalInvoice) || itemValues.subtotal

        result.push({
          ...row,
          values: itemValues,
          isMainRow: index === 0,
          isSecondaryRow: index > 0,
          rowSpan: parts.length,
          partIndex: index,
        })
      })
    } else {
      // Flat single-row structure (Matches UI table row directly)
      const itemValues = { ...rowValues }

      itemValues.parts_description = extractFieldValue(rowValues, null, [
        'parts_description',
        'partsDescription',
        'part_description',
        'partDescription',
        'parts',
        'description',
      ])

      itemValues.parts_qty = extractFieldValue(rowValues, null, [
        'parts_qty',
        'partsQty',
        'parts_quantity',
        'qty',
        'quantity',
      ])

      itemValues.price = extractFieldValue(rowValues, null, [
        'price',
        'unit_price',
        'unitPrice',
        'cost',
      ])

      const qtyNum = parseNumericValue(itemValues.parts_qty)
      const priceNum = parseNumericValue(itemValues.price)

      const rawSubtotal = extractFieldValue(rowValues, null, [
        'subtotal',
        'sub_total',
        'subTotal',
        'amount',
      ])
      const parsedSubtotal = parseNumericValue(rawSubtotal)

      itemValues.subtotal = parsedSubtotal > 0 ? parsedSubtotal : qtyNum * priceNum

      const rawTotalInvoice = extractFieldValue(rowValues, null, [
        'total_invoice_amount',
        'totalInvoiceAmount',
        'total_amount',
        'totalAmount',
      ])
      itemValues.total_invoice_amount = parseNumericValue(rawTotalInvoice) || itemValues.subtotal

      result.push({
        ...row,
        values: itemValues,
        isMainRow: true,
        isSecondaryRow: false,
        rowSpan: 1,
        partIndex: 0,
      })
    }
  })

  return result
}

const rawCellValue = (
  row,
  column,
  rowIndex,
  columnIndex,
  columns,
  tableColumnOffset,
  excelRowNumber,
) => {
  if (isRowNumberColumn(column)) return rowIndex + 1

  const colKey = column.key
  const header = String(column.header || '').trim().toLowerCase()

  // First try direct key on row.values or row if it's a primitive value
  let value = row.values?.[colKey] ?? row[colKey]
  if (typeof value === 'object' && value !== null && !value.formula) {
    value = undefined
  }

  // Fallback matching logic for common column keys
  if (value === undefined || value === null || value === '') {
    if (header.includes('parts desc') || colKey.includes('parts_desc') || colKey === 'partsDescription') {
      value = extractFieldValue(row.values, row, [
        'parts_description',
        'partsDescription',
        'part_description',
        'partDescription',
        'parts',
        'description',
      ])
    } else if (header.includes('parts qty') || colKey.includes('qty') || colKey === 'partsQty') {
      value = extractFieldValue(row.values, row, [
        'parts_qty',
        'partsQty',
        'parts_quantity',
        'qty',
        'quantity',
      ])
    } else if (header === 'price' || colKey === 'price' || colKey === 'unitPrice') {
      value = extractFieldValue(row.values, row, ['price', 'unit_price', 'unitPrice', 'cost'])
    } else if (header === 'subtotal' || colKey === 'subtotal' || colKey === 'subTotal') {
      value = extractFieldValue(row.values, row, ['subtotal', 'sub_total', 'subTotal', 'amount'])
    } else if (header.includes('total invoice') || colKey.includes('total_invoice') || colKey === 'totalInvoiceAmount') {
      value = extractFieldValue(row.values, row, [
        'total_invoice_amount',
        'totalInvoiceAmount',
        'total_amount',
        'totalAmount',
      ])
    }
  }

  if (/store\s*(no|number)/i.test(header) && /^\d+(?:\.0+)?$/.test(String(value ?? '').trim())) {
    return Number(value)
  }

  if (column?.serviceMeta) {
    return value === true || value === 'true' || value === 'X' ? 'X' : ''
  }

  if (typeof value === 'string' && value.trim().startsWith('=')) {
    return { formula: value.trim().slice(1) }
  }

  // Formula generation for Parts Subtotal
  if (header === 'subtotal' || colKey === 'subtotal' || colKey === 'subTotal') {
    const partsQtyColIndex = columns.findIndex(
      (col) => /parts\s*qty/i.test(String(col.header || '')) || col.key === 'parts_qty' || col.key === 'partsQty',
    )
    const priceColIndex = columns.findIndex(
      (col) => /^price$/i.test(String(col.header || '')) || col.key === 'price' || col.key === 'unitPrice',
    )

    if (partsQtyColIndex !== -1 && priceColIndex !== -1) {
      const partsQtyColLetter = getColumnLetter(partsQtyColIndex + tableColumnOffset)
      const priceColLetter = getColumnLetter(priceColIndex + tableColumnOffset)
      const numResult = parseNumericValue(value)

      return {
        formula: `IF(OR(${partsQtyColLetter}${excelRowNumber}="",${priceColLetter}${excelRowNumber}=""),0,${partsQtyColLetter}${excelRowNumber}*${priceColLetter}${excelRowNumber})`,
        result: numResult,
      }
    }
  }

  if (isNumericColumn(column) && value !== '' && value !== null && value !== undefined) {
    const parsed = parseDecimalInput(value)
    return Number.isFinite(parsed) ? parsed : parseNumericValue(value)
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

  const tableColumnOffset = 1
  const tableColumnCount = Math.max(columns.length, 4)
  const colCount = tableColumnCount + tableColumnOffset
  const lastColumnLetter = worksheet.getColumn(colCount).letter
  const secondLastColumnLetter = worksheet.getColumn(colCount - 1).letter
  const expandedRows = processRowsForExport(rows)

  worksheet.columns = new Array(colCount).fill(null).map(() => ({ width: 18 }))
  worksheet.getColumn(1).width = 3

  columns.forEach((column, index) => {
    const header = String(column.header || '').trim().toLowerCase()
    const worksheetColumn = worksheet.getColumn(index + 1 + tableColumnOffset)

    if (/store\s*name/i.test(header)) {
      worksheetColumn.width = 28
    } else if (/store\s*(no|number)/i.test(header)) {
      worksheetColumn.width = 14
    } else if (/^(no\.?|row\s*no)$/i.test(header)) {
      worksheetColumn.width = 8
    } else if (/^(date|dr\s*no\.?|rt\s*no\.?)$/i.test(header)) {
      worksheetColumn.width = 16
    } else {
      worksheetColumn.width = 20
    }
  })

  // Embed Logo
  try {
    const imageId = workbook.addImage({ base64: await toDataUrl(logo), extension: 'png' })
    worksheet.addImage(imageId, { tl: { col: 1.05, row: 0.5 }, ext: { width: 110, height: 75 } })
  } catch (error) {
    // Ignore logo errors
  }

  const from = documentMeta.fromCompany || {}
  const to = documentMeta.toCompany || {}
  let currentRow = 1

  const writeHeaderRow = (rowNum, text, { size = 10, bold = false } = {}) => {
    const startCell = `C${rowNum}`
    const endCell = `${lastColumnLetter}${rowNum}`

    worksheet.mergeCells(`${startCell}:${endCell}`)
    const cell = worksheet.getCell(startCell)
    cell.value = text
    cell.font = { name: 'Calibri', size, bold, color: { argb: 'FF000000' } }
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
    worksheet.getRow(rowNum).height = 20
  }

  writeHeaderRow(
    currentRow,
    `From: ${from.name || 'PHILIPPINE SEVEN CORPORATION'}`,
    { size: 11, bold: true },
  )
  currentRow++

  const fromAddressLines = (
    from.address ||
    '7TH FLR THE COLUMBIA TOWER BLDG. ORTIGAS AVE. WACK-WACK GREENHILLS CITY OF MANDALUYONG NCR SECOND DISTRICT 1550 PHILS.'
  )
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  fromAddressLines.forEach((line) => {
    writeHeaderRow(currentRow, line, { size: 10, bold: true })
    currentRow++
  })

  const fromContact = buildContactLine(from) || 'Mobile: 12321321  Tel: 321321'
  if (fromContact) {
    writeHeaderRow(currentRow, fromContact, { size: 10, bold: true })
    currentRow++
  }

  currentRow++

  writeHeaderRow(
    currentRow,
    `To: ${to.name || '5L SOLUTIONS SUPPLY AND ALLIED SERVICES CORP.'}`,
    { size: 11, bold: true },
  )
  currentRow++

  const toAddressLines = (
    to.address || 'Blk 1 Lot 57 Macaria Ave., Pacita 1, Brgy San Francisco, Biñan City, Laguna'
  )
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  toAddressLines.forEach((line) => {
    writeHeaderRow(currentRow, line, { size: 10, bold: true })
    currentRow++
  })

  const formattedDate =
    formatDateLabel(documentMeta.date) || documentMeta.date || 'September 30, 2026'

  const dateLabelCell = worksheet.getCell(`${secondLastColumnLetter}${currentRow}`)
  dateLabelCell.value = 'Date:'
  dateLabelCell.font = { name: 'Calibri', size: 11, bold: true }
  dateLabelCell.alignment = { horizontal: 'right', vertical: 'middle' }

  const dateValueCell = worksheet.getCell(`${lastColumnLetter}${currentRow}`)
  dateValueCell.value = formattedDate
  dateValueCell.font = { name: 'Calibri', size: 11, bold: true }
  dateValueCell.alignment = { horizontal: 'center', vertical: 'middle' }

  currentRow += 2

  const titleRow = currentRow
  const tableHeaderRow = titleRow + 3

  const firstTableColumnLetter = worksheet.getColumn(1 + tableColumnOffset).letter
  worksheet.mergeCells(`${firstTableColumnLetter}${titleRow}:${lastColumnLetter}${titleRow}`)
  const titleCell = worksheet.getCell(`${firstTableColumnLetter}${titleRow}`)
  titleCell.value = (documentMeta.title || 'ITEMIZED PARTS & REPAIR').toUpperCase()
  titleCell.font = { name: 'Calibri', size: 11, bold: true }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  titleCell.border = tableBorder

  columns.forEach((column, index) => {
    const cell = worksheet.getRow(tableHeaderRow).getCell(index + 1 + tableColumnOffset)
    cell.value = String(column.header || column.key).toUpperCase()
    styleCell(cell, { bold: true, fill: 'FFE0E0E0', fontSize: 10 })
  })

  const mergeTracker = []

  expandedRows.forEach((row, rowIndex) => {
    const currentRowNumber = tableHeaderRow + 1 + rowIndex

    columns.forEach((column, columnIndex) => {
      const cell = worksheet.getRow(currentRowNumber).getCell(columnIndex + 1 + tableColumnOffset)

      if (
        row.isSecondaryRow &&
        !['parts_description', 'parts_qty', 'price', 'subtotal'].includes(column.key)
      ) {
        styleCell(cell, { fontSize: 10 })
        return
      }

      const value = rawCellValue(
        row,
        column,
        rowIndex,
        columnIndex,
        columns,
        tableColumnOffset,
        currentRowNumber,
      )

      cell.value =
        value && typeof value === 'object' && value.formula !== undefined
          ? { formula: value.formula, result: value.result }
          : value

      const isNumber =
        typeof value === 'number' ||
        (value && typeof value === 'object' && value.formula !== undefined)
      const isStoreNo = /store\s*(no|number)/i.test(String(column.header || ''))

      styleCell(cell, {
        number: isNumber && !isStoreNo,
        align: 'center',
        fontSize: 10,
      })

      if (isStoreNo) cell.numFmt = '0'

      if (row.isMainRow && row.rowSpan && row.rowSpan > 1) {
        if (!['parts_description', 'parts_qty', 'price', 'subtotal'].includes(column.key)) {
          const colLetter = getColumnLetter(columnIndex + tableColumnOffset)
          mergeTracker.push({
            range: `${colLetter}${currentRowNumber}:${colLetter}${currentRowNumber + row.rowSpan - 1}`,
          })
        }
      }
    })
  })

  mergeTracker.forEach(({ range }) => {
    try {
      worksheet.mergeCells(range)
    } catch (e) {
      // Range already merged
    }
  })

  const firstDataRow = tableHeaderRow + 1
  const lastDataRow =
    expandedRows.length > 0 ? tableHeaderRow + expandedRows.length : firstDataRow

  const subtotalColumnIndex = columns.findIndex(
    (column) => /subtotal/i.test(String(column.header || '')) || column.key === 'subtotal',
  )
  const targetColIdx = subtotalColumnIndex !== -1 ? subtotalColumnIndex : columns.length - 1

  const sumColumnLetter = worksheet.getColumn(targetColIdx + 1 + tableColumnOffset).letter
  const sumRange = `${sumColumnLetter}${firstDataRow}:${sumColumnLetter}${lastDataRow}`

  const valueColumnLetter = worksheet.getColumn(tableColumnCount + tableColumnOffset).letter
  const labelColumnLetter = worksheet.getColumn(tableColumnCount - 1 + tableColumnOffset).letter

  const subtotalRow = lastDataRow + 1
  const vatRow = subtotalRow + 1
  const totalRow = vatRow + 1

  let computedSubtotal = parseNumericValue(totals.subTotal)
  if (!computedSubtotal) {
    computedSubtotal = expandedRows.reduce((acc, current) => {
      return acc + parseNumericValue(current.values?.subtotal)
    }, 0)
  }

  const computedVat = parseNumericValue(totals.vat) || Math.round(computedSubtotal * 0.12 * 100) / 100
  const computedTotal = parseNumericValue(totals.total) || computedSubtotal + computedVat

  const writeTotalRow = (rowNumber, label, formula, result, bold = false) => {
    const labelCell = worksheet.getCell(`${labelColumnLetter}${rowNumber}`)
    const valueCell = worksheet.getCell(`${valueColumnLetter}${rowNumber}`)
    labelCell.value = label
    valueCell.value = { formula, result: parseNumericValue(result) }
    styleCell(labelCell, { bold, align: 'left', fontSize: 10 })
    styleCell(valueCell, { bold, number: true, align: 'right', fontSize: 10 })
  }

  writeTotalRow(subtotalRow, 'TOTAL SALES:', `SUM(${sumRange})`, computedSubtotal, true)
  writeTotalRow(
    vatRow,
    '12% VAT:',
    `ROUND(${valueColumnLetter}${subtotalRow}*0.12, 2)`,
    computedVat,
    true,
  )
  writeTotalRow(
    totalRow,
    'TOTAL PROJECT COST:',
    `${valueColumnLetter}${subtotalRow}+${valueColumnLetter}${vatRow}`,
    computedTotal,
    true,
  )

  worksheet.getRow(titleRow).height = 24
  worksheet.getRow(tableHeaderRow).height = 36

  // Signatures Section
  const signatureLabelRow = totalRow + 3
  const signatureLineRow = signatureLabelRow + 2

  let prepStartIdx, prepEndIdx, recStartIdx, recEndIdx

  if (tableColumnCount <= 4) {
    prepStartIdx = 2
    prepEndIdx = 2
    recStartIdx = 5
    recEndIdx = 5
  } else {
    const spanSize = Math.max(1, Math.floor((tableColumnCount - 1) / 2))
    prepStartIdx = 1 + tableColumnOffset
    prepEndIdx = prepStartIdx + spanSize - 1
    recEndIdx = tableColumnCount + tableColumnOffset
    recStartIdx = recEndIdx - spanSize + 1
  }

  const prepStartLetter = getColumnLetter(prepStartIdx - 1)
  const prepEndLetter = getColumnLetter(prepEndIdx - 1)
  const recStartLetter = getColumnLetter(recStartIdx - 1)
  const recEndLetter = getColumnLetter(recEndIdx - 1)

  if (prepStartIdx !== prepEndIdx) {
    worksheet.mergeCells(`${prepStartLetter}${signatureLabelRow}:${prepEndLetter}${signatureLabelRow}`)
    worksheet.mergeCells(`${prepStartLetter}${signatureLineRow}:${prepEndLetter}${signatureLineRow}`)
  }
  if (recStartIdx !== recEndIdx) {
    worksheet.mergeCells(`${recStartLetter}${signatureLabelRow}:${recEndLetter}${signatureLabelRow}`)
    worksheet.mergeCells(`${recStartLetter}${signatureLineRow}:${recEndLetter}${signatureLineRow}`)
  }

  const prepCell = worksheet.getCell(`${prepStartLetter}${signatureLabelRow}`)
  prepCell.value = 'Prepared By:'
  prepCell.font = { name: 'Calibri', size: 11, bold: true }
  prepCell.alignment = { horizontal: 'center', vertical: 'middle' }

  const recCell = worksheet.getCell(`${recStartLetter}${signatureLabelRow}`)
  recCell.value = 'Received By:'
  recCell.font = { name: 'Calibri', size: 11, bold: true }
  recCell.alignment = { horizontal: 'center', vertical: 'middle' }

  for (let c = prepStartIdx; c <= prepEndIdx; c++) {
    const colLetter = getColumnLetter(c - 1)
    worksheet.getCell(`${colLetter}${signatureLineRow}`).border = {
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
    }
  }

  for (let c = recStartIdx; c <= recEndIdx; c++) {
    const colLetter = getColumnLetter(c - 1)
    worksheet.getCell(`${colLetter}${signatureLineRow}`).border = {
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
    }
  }

  const safeName = String(filename || `statement-${statementId || 'export'}`)
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