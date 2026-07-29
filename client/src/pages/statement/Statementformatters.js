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
  return /(^|\s)qty($|\s|\()/i.test(header) || /(^|_)qty($|_)/i.test(key)
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

export const getComputedVatValue = (rowTotal = 0, vatRate = 0.12) => {
  const parsedTotal = parseDecimalInput(rowTotal)
  return Number((parsedTotal * vatRate).toFixed(2))
}

export const getComputedSalesTotal = (rowValues = {}, columns = []) => {
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
export const getExportCellValue = (row, col, rowIdx) => {
  if (isRowNumberColumn(col)) {
    return String(rowIdx + 1)
  }
  return row.values?.[col.key] ?? ''
}
