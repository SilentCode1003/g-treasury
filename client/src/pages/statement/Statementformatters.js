// -----------------------------------------------------------------------
// Shared constants + pure helper functions for the Statement of Account
// screen. Kept framework-agnostic (no React) so the Excel/PDF exporters
// and the table component can all import from a single source of truth.
// -----------------------------------------------------------------------

export const MONTH_OPTIONS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const formatMonthLabel = (value) => {
  if (!value) return ''
  const [month, year] = value.split('-')
  if (!month || !year) return value
  const monthIndex = Number(month) - 1
  return `${MONTH_OPTIONS[monthIndex] || month} ${year}`
}

export const formatDateLabel = (value) => {
  if (!value) return ''
  // Handle YYYY-MM-DD format
  const parts = value.split('-')
  if (parts.length === 3) {
    const [year, month, day] = parts
    const monthIndex = Number(month) - 1
    const monthName = MONTH_OPTIONS[monthIndex] || month
    return `${monthName} ${Number(day)}, ${year}`
  }
  // Fallback to old MM-YYYY format
  return formatMonthLabel(value)
}

export const formatCurrency = (value) =>
  // Aligned with localization standard
  Number(value || 0).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export const normalizeServiceId = (value) => String(value ?? '').trim()

export const formatDecimalValue = (value) => {
  const parsedValue = Number(value || 0)
  if (!Number.isFinite(parsedValue)) return '0.00'
  return parsedValue.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export const isSalesColumn = (col) => {
  const header = String(col.header || '')
    .trim()
    .toLowerCase()
  const key = String(col.key || '')
    .trim()
    .toLowerCase()
  return header === 'sales' || key === 'sales' || /(^|_)sales$/.test(key)
}

export const isAdditionalSalesColumn = (col) => {
  const header = String(col.header || '')
    .trim()
    .toLowerCase()
  const key = String(col.key || '')
    .trim()
    .toLowerCase()
  return (
    header.includes('additional sales') ||
    header.includes('mobilization') ||
    key.includes('additional_sales') ||
    key.includes('mobilization')
  )
}

export const isQuantityColumn = (col) => {
  const header = String(col.header || '')
    .trim()
    .toLowerCase()
  const key = String(col.key || '')
    .trim()
    .toLowerCase()
  return /(^|\s)qty($|\s|\()/i.test(header) || /(^|_)qty($|_)/i.test(key) ||
         /(^|\s)quantity($|\s|\()/i.test(header) || /(^|_)quantity($|_)/i.test(key) ||
         /no of store|no\. of store|number of store|store count/i.test(header) ||
         /no_of_store|no_of_store|number_of_store|store_count/i.test(key)
}

export const isTotalSalesColumn = (col) => {
  const header = String(col.header || '')
    .trim()
    .toLowerCase()
  const key = String(col.key || '')
    .trim()
    .toLowerCase()
  return header.includes('total sales') || key.includes('total_sales') || key.includes('totalsales')
}

export const isDateColumn = (col) => {
  const header = String(col.header || '')
    .trim()
    .toLowerCase()
  const key = String(col.key || '')
    .trim()
    .toLowerCase()
  return header === 'date' || key === 'date' || /date/.test(header) || /date/.test(key)
}

export const parseDecimalInput = (value) => {
  const normalized = String(value ?? '')
    .replace(/,/g, '')
    .trim()
  const parsed = Number(normalized || 0)
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0
}

export const formatNumberInput = (value) => {
  const normalized = String(value ?? '').replace(/,/g, '').trim()
  const parsed = Number(normalized || 0)
  if (!Number.isFinite(parsed)) return ''
  return parsed.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export const formatQuantityInput = (value) => {
  const normalized = String(value ?? '').replace(/,/g, '').trim()
  const parsed = Number(normalized || 0)
  if (!Number.isFinite(parsed)) return ''
  return parsed.toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export const isNumericColumn = (col) => {
  // Skip service columns (checkboxes)
  if (col?.serviceMeta) {
    return false
  }
  
  const header = String(col.header || '')
    .trim()
    .toLowerCase()
  const key = String(col.key || '')
    .trim()
    .toLowerCase()
  
  const numericKeywords = [
    'amount', 'price', 'cost', 'total', 'subtotal',
    'per store', 'amount per store', 'price per store',
    'vat', 'tax', 'rate', 'percent', '%',
    'vat-ex', 'vat-in', 'vatin', 'vatex',
    'sales', 'additional', 'mobilization'
  ]
  
  return numericKeywords.some(keyword => 
    header.includes(keyword) || key.includes(keyword)
  )
}

export const getComputedVatValue = (rowTotal = 0, vatRate = 0.12) => {
  const parsedTotal = parseDecimalInput(rowTotal)
  return Number((parsedTotal * vatRate).toFixed(2))
}

export const isMaintenanceFormat = (columns = []) => {
  const headers = columns.map(col => String(col.header || '').trim().toLowerCase())
  // Regional Summary format
  const isRegionalSummary = headers.includes('area') && 
         headers.includes('no of store') && 
         headers.includes('price per store') && 
         headers.includes('total amount')
  // Official Invoice format
  const isOfficialInvoice = headers.includes('area') &&
         headers.includes('no of store') &&
         headers.includes('amount per store') &&
         headers.includes('total vat-ex')
  return isRegionalSummary || isOfficialInvoice
}

export const getMaintenanceTotalAmount = (rowValues = {}, columns = []) => {
  const headers = columns.map(col => String(col.header || '').trim().toLowerCase())
  
  // Check if this is Official Invoice format (uses TOTAL VAT-IN)
  if (headers.includes('total vat-in')) {
    const totalVatInColumn = columns.find((col) => {
      const header = String(col.header || '').trim().toLowerCase()
      return header === 'total vat-in'
    })
    return totalVatInColumn ? parseDecimalInput(rowValues?.[totalVatInColumn.key]) : 0
  }
  
  // Regional Summary format (uses TOTAL AMOUNT)
  const totalAmountColumn = columns.find((col) => {
    const header = String(col.header || '').trim().toLowerCase()
    return header === 'total amount'
  })
  return totalAmountColumn ? parseDecimalInput(rowValues?.[totalAmountColumn.key]) : 0
}

export const getComputedSalesTotal = (rowValues = {}, columns = []) => {
  // Check if this is maintenance format
  if (isMaintenanceFormat(columns)) {
    return getMaintenanceTotalAmount(rowValues, columns)
  }
  
  // Check if this is parts format
  if (hasPartsColumns(columns)) {
    const partsKeys = getPartsColumnKeys(columns)
    // If there's a TOTAL INVOICE AMOUNT column, use that
    if (partsKeys.totalInvoiceAmount && rowValues?.[partsKeys.totalInvoiceAmount]) {
      return parseDecimalInput(rowValues[partsKeys.totalInvoiceAmount])
    }
    // Otherwise, sum the parts subtotals
    return 0 // Parts subtotals are handled at row level in StatementDetails
  }

  const salesColumn = columns.find((col) => isSalesColumn(col))
  const additionalSalesColumn = columns.find((col) => isAdditionalSalesColumn(col))
  const serviceColumns = columns.filter((col) => col?.serviceMeta && !isQuantityColumn(col))

  const salesValue = salesColumn ? parseDecimalInput(rowValues?.[salesColumn.key]) : 0
  const additionalValue = additionalSalesColumn
    ? parseDecimalInput(rowValues?.[additionalSalesColumn.key])
    : 0

  const serviceSum = serviceColumns.reduce((sum, col) => {
    const price = Number(col.serviceMeta?.servicePrice || 0)
    const quantityColumn = columns.find(
      (candidate) =>
        isQuantityColumn(candidate) &&
        String(candidate?.quantityMeta?.relatedServiceKey || '').toLowerCase() ===
          String(col.key || '').toLowerCase(),
    )
    const quantityValue = parseDecimalInput(rowValues?.[quantityColumn?.key])
    const isSelected = Boolean(rowValues?.[col.key]) || quantityValue > 0

    if (!isSelected) return sum

    const effectiveQuantity = quantityColumn ? Math.max(quantityValue, 0) : 1
    return Number((sum + price * effectiveQuantity).toFixed(2))
  }, 0)

  const baseSalesValue = serviceColumns.length > 0 ? serviceSum : salesValue

  return Number((baseSalesValue + additionalValue).toFixed(2))
}

// Builds a single-line "Mobile: xxx   Tel: xxx" contact string, skipping empties
export const buildContactLine = (entity = {}) =>
  [entity.mobile ? `Mobile: ${entity.mobile}` : '', entity.phone ? `Tel: ${entity.phone}` : '']
    .filter(Boolean)
    .join('   ')

export const isStoreNameColumn = (col) => {
  const header = String(col.header || '')
    .trim()
    .toLowerCase()
  const key = String(col.key || '')
    .trim()
    .toLowerCase()
  return /store\s*name/i.test(header) || /store_name|store.*name/.test(key)
}

export const isStoreNumberColumn = (col) => {
  const header = String(col.header || '')
    .trim()
    .toLowerCase()
  const key = String(col.key || '')
    .trim()
    .toLowerCase()
  return (
    /store\s*(no|number)/i.test(header) || /store_(no|number)|store.*number|store.*no/.test(key)
  )
}

export const isRowNumberColumn = (col) => {
  const normalizedHeader = String(col.header || '')
    .trim()
    .toLowerCase()
  const normalizedKey = String(col.key || '')
    .trim()
    .toLowerCase()
  return (
    /^(no\.?|#|index|number|row\s*no)$/i.test(normalizedHeader) ||
    /^(no|index|number|row_no|row_number)$/i.test(normalizedKey)
  )
}

// Resolves what should actually be written out for a given cell when
// exporting (auto-numbers the "No." column instead of trusting stored data).
export const getExportCellValue = (row, col, rowIdx, isPart = false) => {
  if (isRowNumberColumn(col)) {
    return String(rowIdx + 1)
  }
  
  // For parts rows, get value from part.values
  const value = isPart ? row.values?.[col.key] ?? '' : row.values?.[col.key] ?? ''
  
  // Handle checkbox columns (service columns)
  if (col?.serviceMeta) {
    return value === true || value === 'true' || value === 'X' ? 'X' : ''
  }
  
  // Format numeric columns with proper money format (thousands separators, 2 decimals)
  if (isNumericColumn(col) && value !== '' && value !== null && value !== undefined) {
    // Skip if it's a checkbox value
    if (value === true || value === false || value === 'true' || value === 'false') {
      return value === true || value === 'true' ? 'X' : ''
    }
    
    const parsedValue = parseDecimalInput(value)
    if (!isNaN(parsedValue)) {
      return formatDecimalValue(parsedValue)
    }
    return '0.00'
  }
  
  return value
}

// Check if table has parts columns
export const hasPartsColumns = (columns = []) => {
  const headers = columns.map(col => String(col.header || '').toUpperCase())
  return headers.includes('PARTS DESCRIPTION') && 
         headers.includes('PARTS QTY.') && 
         headers.includes('PRICE') && 
         headers.includes('SUBTOTAL')
}

// Get parts column keys
export const getPartsColumnKeys = (columns = []) => {
  const headers = columns.map(col => ({
    key: col.key,
    header: String(col.header || '').toUpperCase()
  }))
  
  return {
    partsDescription: headers.find(h => h.header === 'PARTS DESCRIPTION')?.key,
    partsQty: headers.find(h => h.header === 'PARTS QTY.')?.key,
    price: headers.find(h => h.header === 'PRICE')?.key,
    subtotal: headers.find(h => h.header === 'SUBTOTAL')?.key,
    totalInvoiceAmount: headers.find(h => h.header === 'TOTAL INVOICE AMOUNT')?.key
  }
}

// Expand rows with nested parts for export
export const expandRowsForExport = (rows = [], columns = []) => {
  if (!hasPartsColumns(columns)) {
    return rows
  }
  
  const partsKeys = getPartsColumnKeys(columns)
  const expandedRows = []
  let globalRowIndex = 0
  
  rows.forEach((row) => {
    const parts = row.parts || []
    
    if (parts.length === 0) {
      // No parts, just add the main row
      expandedRows.push({ ...row, values: row.values || {} })
      globalRowIndex++
    } else {
      // Compute total invoice amount for this row (sum of all part subtotals)
      const totalInvoiceAmount = parts.reduce((sum, part) => {
        return sum + (part.values?.subtotal || 0)
      }, 0)
      
      // Add main row (parent) with parts data from first part and TOTAL INVOICE AMOUNT
      const mainRowValues = { ...row.values }
      // Use first part's data for parts columns
      const firstPart = parts[0]
      if (partsKeys.partsDescription && firstPart.values?.partsDescription) {
        mainRowValues[partsKeys.partsDescription] = firstPart.values.partsDescription
      }
      if (partsKeys.partsQty && firstPart.values?.partsQty !== undefined) {
        mainRowValues[partsKeys.partsQty] = firstPart.values.partsQty
      }
      if (partsKeys.price && firstPart.values?.price !== undefined) {
        mainRowValues[partsKeys.price] = firstPart.values.price
      }
      if (partsKeys.subtotal && firstPart.values?.subtotal !== undefined) {
        mainRowValues[partsKeys.subtotal] = firstPart.values.subtotal
      }
      // Set TOTAL INVOICE AMOUNT for main row
      if (partsKeys.totalInvoiceAmount) {
        mainRowValues[partsKeys.totalInvoiceAmount] = totalInvoiceAmount
      }
      
      // Mark this row with rowSpan info for PDF export
      expandedRows.push({ 
        ...row, 
        values: mainRowValues,
        rowSpan: parts.length,
        isMainRow: true
      })
      globalRowIndex++
      
      // Add remaining parts as separate rows (for Excel only, PDF will use rowSpan)
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i]
        const partRowValues = {}
        // Clear all main columns
        columns.forEach(col => {
          if (!partsKeys.partsDescription || col.key !== partsKeys.partsDescription) {
            if (!partsKeys.partsQty || col.key !== partsKeys.partsQty) {
              if (!partsKeys.price || col.key !== partsKeys.price) {
                if (!partsKeys.subtotal || col.key !== partsKeys.subtotal) {
                  partRowValues[col.key] = ''
                }
              }
            }
          }
        })
        // Set parts values
        if (partsKeys.partsDescription && part.values?.partsDescription) {
          partRowValues[partsKeys.partsDescription] = part.values.partsDescription
        }
        if (partsKeys.partsQty && part.values?.partsQty !== undefined) {
          partRowValues[partsKeys.partsQty] = part.values.partsQty
        }
        if (partsKeys.price && part.values?.price !== undefined) {
          partRowValues[partsKeys.price] = part.values.price
        }
        if (partsKeys.subtotal && part.values?.subtotal !== undefined) {
          partRowValues[partsKeys.subtotal] = part.values.subtotal
        }
        // TOTAL INVOICE AMOUNT should be empty for part rows
        if (partsKeys.totalInvoiceAmount) {
          partRowValues[partsKeys.totalInvoiceAmount] = ''
        }
        
        expandedRows.push({ 
          ...row, 
          values: partRowValues,
          isPartRow: true,
          parentRowId: row.id
        })
        globalRowIndex++
      }
    }
  })
  
  return expandedRows
}
