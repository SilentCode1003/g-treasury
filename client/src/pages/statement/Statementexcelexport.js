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

// Convert a 0-based column index to an Excel column letter (0 -> A, 1 -> B, 26 -> AA)
// ALWAYS pass a 0-based index here. Do NOT add +1.
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

const isEmptyValue = (v) => v === undefined || v === null || v === ''

// "DR NO." / "dr_no" / "drNo" all become "drno"
const normalizeKey = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

// Merge two row objects; a non-empty value is never overwritten by an empty one
const mergePreferNonEmpty = (base, override) => {
  const result = { ...(base || {}) }
  Object.entries(override || {}).forEach(([k, v]) => {
    if (!isEmptyValue(v) || isEmptyValue(result[k])) result[k] = v
  })
  return result
}

// Extra field names to try for common columns, matched by the column header
const HEADER_ALIASES = [
  {
    test: /^dr\s*(no|number|#)?\.?$/i,
    keys: ['drNo', 'drNumber', 'dr', 'deliveryReceiptNo', 'deliveryReceiptNumber', 'deliveryReceipt'],
  },
  {
    test: /^rt\s*(no|number|#)?\.?$/i,
    keys: ['rtNo', 'rtNumber', 'rt'],
  },
  {
    test: /store\s*(no|number|code)/i,
    keys: ['storeNo', 'storeNumber', 'storeCode'],
  },
  {
    test: /store\s*name/i,
    keys: ['storeName', 'store'],
  },
]

// Flatten row + row.values into { normalizedKey: primitiveValue }; values win, empties never win
const buildRowIndex = (row) => {
  const index = {}
  const add = (obj) => {
    if (!obj || typeof obj !== 'object') return
    Object.entries(obj).forEach(([k, v]) => {
      if (v !== null && typeof v === 'object') return // skip nested objects / arrays
      const nk = normalizeKey(k)
      if (!nk) return
      if (!(nk in index) || isEmptyValue(index[nk])) index[nk] = v
    })
  }
  add(row.values)
  add(row)
  return index
}

// Find a cell's value by column key, then column header, then known aliases
const getRowValue = (row, column) => {
  const index = buildRowIndex(row)
  const header = String(column.header || '').trim()
  const candidates = [column.key, header]
  HEADER_ALIASES.forEach(({ test, keys }) => {
    if (test.test(header)) candidates.push(...keys)
  })

  for (const candidate of candidates) {
    const nk = normalizeKey(candidate)
    if (!nk) continue
    if (nk in index && !isEmptyValue(index[nk])) return index[nk]
  }
  return undefined
}

// Checkbox / service column helpers
const isTruthyFlag = (v) =>
  v === true ||
  v === 1 ||
  ['true', 'x', 'yes', 'y', '1', 'checked'].includes(String(v ?? '').trim().toLowerCase())

const isBooleanLike = (v) =>
  typeof v === 'boolean' ||
  (typeof v === 'string' && ['true', 'false'].includes(v.trim().toLowerCase()))

const SERVICE_HEADER_PATTERN = /^(new\s*store|renovation)$/i

// Custom expand function that properly formats single rows and multi-part rows
const processRowsForExport = (rows) => {
  const result = []

  rows.forEach((row) => {
    const rowValues = mergePreferNonEmpty(row.values, row)

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
  isBulkExport = false,
  sheetName = '',
  isServiceColumn = false,
) => {
  if (isRowNumberColumn(column)) return { value: rowIndex + 1, isRowNumber: true }

  const colKey = column.key
  const header = String(column.header || '').trim().toLowerCase()

  // Letter for a column index in the `columns` array (0-based index -> Excel letter)
  const letterFor = (colIndex) => getColumnLetter(colIndex + tableColumnOffset)

  // Look up by column key, header, and known aliases (case/punctuation-insensitive)
  let value = getRowValue(row, column)

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
    } else if (header === 'area' || colKey === 'area') {
      value = extractFieldValue(row.values, row, ['area', 'Area', 'AREA'])
    } else if (header.includes('no of store') || colKey === 'noOfStore' || colKey === 'no_of_store') {
      value = extractFieldValue(row.values, row, ['noOfStore', 'no_of_store', 'NO OF STORE'])
    } else if (header.includes('price per store') || colKey === 'pricePerStore' || colKey === 'price_per_store') {
      value = extractFieldValue(row.values, row, ['pricePerStore', 'price_per_store', 'PRICE PER STORE'])
    } else if (header.includes('total amount') || colKey === 'totalAmount' || colKey === 'total_amount') {
      value = extractFieldValue(row.values, row, ['totalAmount', 'total_amount', 'TOTAL AMOUNT'])
    } else if (header.includes('additional sales') || colKey.includes('additional_sales') || colKey === 'additionalSales') {
      value = extractFieldValue(row.values, row, [
        'additional_sales',
        'additionalSales',
        'additional_sales_mobilization',
        'additionalSalesMobilization',
      ])
    }
  }

  if (/store\s*(no|number)/i.test(header) && /^\d+(?:\.0+)?$/.test(String(value ?? '').trim())) {
    return Number(value)
  }

  // Service / checkbox columns (NEW STORE, RENOVATION, ...): checked -> "X", unchecked -> blank
  if (isServiceColumn || column?.serviceMeta) {
    return isTruthyFlag(value) ? 'X' : ''
  }

  // Formula generation for Parts Subtotal (PARTS QTY * PRICE)
  if (header === 'subtotal' || colKey === 'subtotal' || colKey === 'subTotal') {
    const partsQtyColIndex = columns.findIndex(
      (col) => /parts\s*qty/i.test(String(col.header || '')) || col.key === 'parts_qty' || col.key === 'partsQty',
    )
    const priceColIndex = columns.findIndex(
      (col) => /^price$/i.test(String(col.header || '')) || col.key === 'price' || col.key === 'unitPrice',
    )

    if (
      partsQtyColIndex !== -1 &&
      priceColIndex !== -1 &&
      columnIndex !== partsQtyColIndex &&
      columnIndex !== priceColIndex
    ) {
      const qtyRef = `${letterFor(partsQtyColIndex)}${excelRowNumber}`
      const priceRef = `${letterFor(priceColIndex)}${excelRowNumber}`

      return {
        formula: `IF(OR(${qtyRef}="",${priceRef}=""),0,${qtyRef}*${priceRef})`,
        result: parseNumericValue(value),
      }
    }
  }

  // Formula generation for Regional Summary TOTAL AMOUNT (NO OF STORE * PRICE PER STORE)
  if (header.includes('total amount') || colKey === 'totalAmount' || colKey === 'total_amount') {
    const noOfStoreColIndex = columns.findIndex(
      (col) => /no\s*of\s*store/i.test(String(col.header || '')) || col.key === 'noOfStore' || col.key === 'no_of_store',
    )
    const pricePerStoreColIndex = columns.findIndex(
      (col) => /price\s*per\s*store/i.test(String(col.header || '')) || col.key === 'pricePerStore' || col.key === 'price_per_store',
    )

    if (
      noOfStoreColIndex !== -1 &&
      pricePerStoreColIndex !== -1 &&
      columnIndex !== noOfStoreColIndex &&
      columnIndex !== pricePerStoreColIndex
    ) {
      const storeRef = `${letterFor(noOfStoreColIndex)}${excelRowNumber}`
      const priceRef = `${letterFor(pricePerStoreColIndex)}${excelRowNumber}`

      return {
        formula: `IF(OR(${storeRef}="",${priceRef}=""),0,${storeRef}*${priceRef})`,
        result: parseNumericValue(value),
      }
    }
  }

  // Formula generation for Service TOTAL SALES (SALES + ADDITIONAL SALES (MOBILIZATION))
  if (
    header.includes('total sales') ||
    colKey === 'totalSales' ||
    colKey === 'total_sales'
  ) {
    const salesColIndex = columns.findIndex(
      (col) => /^sales$/i.test(String(col.header || '').trim()) || col.key === 'sales',
    )
    const additionalSalesColIndex = columns.findIndex(
      (col) => /additional\s*sales/i.test(String(col.header || '')) || col.key === 'additionalSales' || col.key === 'additional_sales',
    )

    if (
      salesColIndex !== -1 &&
      additionalSalesColIndex !== -1 &&
      columnIndex !== salesColIndex &&
      columnIndex !== additionalSalesColIndex
    ) {
      const salesRef = `${letterFor(salesColIndex)}${excelRowNumber}`
      const additionalRef = `${letterFor(additionalSalesColIndex)}${excelRowNumber}`

      return {
        formula: `IF(OR(${salesRef}="",${additionalRef}=""),0,${salesRef}+${additionalRef})`,
        result: parseNumericValue(value),
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

// True if a formula text references the given cell address (e.g. "F12") as a standalone reference
const formulaReferencesCell = (formula, address) => {
  const pattern = new RegExp(`(^|[^A-Za-z0-9_$])\\$?${address.replace(/\d+$/, '')}\\$?${address.match(/\d+$/)[0]}(?![0-9])`, 'i')
  return pattern.test(formula)
}

// Helper function to build a worksheet (used for both single and bulk export)
const buildWorksheetContent = async ({
  workbook,
  worksheet,
  columns,
  rows,
  documentMeta = {},
  statementId,
  totals = {},
  cachedImageId = null,
  skipLogo = false,
  isBulkExport = false,
}) => {
  const tableColumnOffset = 0 // Start table at column A
  const tableColumnCount = Math.max(columns.length, 4)
  const colCount = tableColumnCount + tableColumnOffset
  const lastColumnLetter = worksheet.getColumn(colCount).letter
  const secondLastColumnLetter = worksheet.getColumn(colCount - 1).letter
  const expandedRows = processRowsForExport(rows)
  const sheetName = worksheet.name // Get sheet name for scoped formulas

  // Detect service (checkbox) columns: flagged by serviceMeta, named like a known service,
  // or holding true/false values in any row
  const serviceColumnIndexes = new Set()
  columns.forEach((column, index) => {
    if (isRowNumberColumn(column)) return
    const header = String(column.header || '').trim()
    if (
      column?.serviceMeta ||
      SERVICE_HEADER_PATTERN.test(header) ||
      expandedRows.some((r) => isBooleanLike(getRowValue(r, column)))
    ) {
      serviceColumnIndexes.add(index)
    }
  })

  worksheet.columns = new Array(colCount).fill(null).map(() => ({ width: 18 }))

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

  // Embed Logo (use cached image ID if provided, otherwise add it)
  // Skip logo if skipLogo flag is true (for bulk exports to avoid corruption)
  if (!skipLogo) {
    let imageId = cachedImageId
    if (!imageId) {
      try {
        imageId = workbook.addImage({ base64: await toDataUrl(logo), extension: 'png' })
      } catch (error) {
        // Ignore logo errors
      }
    }
    if (imageId) {
      try {
        // Position logo with absolute dimensions to maintain actual size
        worksheet.addImage(imageId, {
          tl: { col: 0.2, row: 0.8 },
          ext: { width: 100, height: 70 },
        })
      } catch (error) {
        // Ignore image placement errors
      }
    }
  }

  const from = documentMeta.fromCompany || {}
  const to = documentMeta.toCompany || {}
  let currentRow = 1

  const writeHeaderRow = (rowNum, text, { size = 10, bold = false } = {}) => {
    const startCell = `A${rowNum}`
    const endCell = `${lastColumnLetter}${rowNum}`

    worksheet.mergeCells(`${startCell}:${endCell}`)
    const cell = worksheet.getCell(startCell)
    cell.value = text
    cell.font = { name: 'Calibri', size, bold, color: { argb: 'FF000000' } }
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 12, wrapText: true }
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

      let value = rawCellValue(
        row,
        column,
        rowIndex,
        columnIndex,
        columns,
        tableColumnOffset,
        currentRowNumber,
        isBulkExport,
        sheetName,
        serviceColumnIndexes.has(columnIndex),
      )

      // Handle row numbers - display as integer without decimal formatting
      if (value && value.isRowNumber) {
        cell.value = value.value
        cell.numFmt = '0' // Integer format
        styleCell(cell, { align: 'center', fontSize: 10 })
        return
      }

      // SAFETY GUARD: never write a formula that references its own cell.
      // If that ever happens, fall back to the plain computed value instead of
      // triggering Excel's "circular reference" warning.
      if (value && typeof value === 'object' && value.formula !== undefined) {
        const ownAddress = `${getColumnLetter(columnIndex + tableColumnOffset)}${currentRowNumber}`
        if (formulaReferencesCell(value.formula, ownAddress)) {
          console.warn(
            `Skipped self-referencing formula in ${ownAddress}: ${value.formula}`,
          )
          value = value.result
        }
      }

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

    // Use formula if provided, otherwise use computed value
    if (formula) {
      valueCell.value = { formula, result: parseNumericValue(result) }
    } else {
      valueCell.value = parseNumericValue(result)
    }
    styleCell(labelCell, { bold, align: 'left', fontSize: 10 })
    styleCell(valueCell, { bold, number: true, align: 'right', fontSize: 10 })
  }

  // Totals reference the data range only (rows above the totals), never their own cells
  writeTotalRow(subtotalRow, 'TOTAL SALES:', `SUM(${sumRange})`, computedSubtotal, true)
  writeTotalRow(
    vatRow,
    '12% VAT:',
    `ROUND(SUM(${sumRange})*0.12, 2)`,
    computedVat,
    true,
  )
  writeTotalRow(
    totalRow,
    'TOTAL PROJECT COST:',
    `SUM(${sumRange})*1.12`,
    computedTotal,
    true,
  )

  worksheet.getRow(titleRow).height = 24
  worksheet.getRow(tableHeaderRow).height = 36

  // Signatures Section (these indexes are 1-based, hence the "- 1" below)
  const signatureLabelRow = totalRow + 3
  const signatureLineRow = signatureLabelRow + 2

  let prepStartIdx, prepEndIdx, recStartIdx, recEndIdx

  if (tableColumnCount <= 4) {
    prepStartIdx = 2
    prepEndIdx = 2
    recStartIdx = 4
    recEndIdx = 4
  } else {
    const spanSize = Math.max(1, Math.floor((tableColumnCount - 2) / 2))
    prepStartIdx = 2 + tableColumnOffset
    prepEndIdx = prepStartIdx + spanSize - 1
    recStartIdx = prepEndIdx + 2 // Add gap of 1 column between
    recEndIdx = recStartIdx + spanSize - 1
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
}

export const exportStatementToExcel = async ({
  columns,
  rows,
  documentMeta = {},
  statementId,
  filename,
  totals = {},
  workbook = null,
  sheetName = 'SOA',
  cachedImageId = null,
  skipLogo = false,
  maintenanceFormat = null,
}) => {
  const workbookInstance = workbook || new ExcelJS.Workbook()
  const isBulkExport = workbook !== null // Detect bulk export mode

  // Sanitize sheet name (Excel has restrictions on sheet names)
  // Invalid characters: \ / ? * [ ] :
  // Cannot be empty, cannot exceed 31 characters
  // Cannot start or end with single quote
  let sanitizedSheetName = sheetName
    .replace(/[\\/?*[\]:]/g, '_') // Remove invalid characters
    .replace(/^'/g, '') // Don't start with single quote
    .replace(/'$/g, '') // Don't end with single quote
    .trim()
    .substring(0, 31) // Max 31 characters

  // Ensure it's not empty and doesn't start with a number
  if (!sanitizedSheetName || /^\d/.test(sanitizedSheetName)) {
    sanitizedSheetName = `Sheet_${sanitizedSheetName || Math.floor(Math.random() * 1000)}`
  }

  const worksheet = workbookInstance.addWorksheet(sanitizedSheetName)
  worksheet.views = [{ state: 'normal', showGridLines: true }]

  // Cache image ID for bulk export (only add logo once to workbook)
  // Skip logo in bulk export to avoid corruption issues
  let imageId = cachedImageId
  const shouldSkipLogo = skipLogo || isBulkExport
  if (!imageId && !workbook && !shouldSkipLogo) {
    try {
      imageId = workbookInstance.addImage({ base64: await toDataUrl(logo), extension: 'png' })
    } catch (error) {
      console.error('Failed to add logo:', error)
      // Ignore logo errors
    }
  }

  await buildWorksheetContent({
    workbook: workbookInstance,
    worksheet,
    columns,
    rows,
    documentMeta,
    statementId,
    totals,
    cachedImageId: imageId,
    skipLogo: shouldSkipLogo,
    isBulkExport,
  })

  // Only download if filename is provided (single export mode)
  // If workbook was passed in (bulk export mode), return it instead
  if (filename && !workbook) {
    const safeName = String(filename)
      .replace(/[\\/:*?"<>|]/g, '')
      .trim() || `statement-${statementId || 'export'}`
    const finalName = safeName.toLowerCase().endsWith('.xlsx') ? safeName : `${safeName}.xlsx`

    const buffer = await workbookInstance.xlsx.writeBuffer()
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

  // Return workbook for bulk export mode
  return workbookInstance
}