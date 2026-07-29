const buildStatementTitle = (services = []) => {
  const serviceNames = services
    .map((service) => String(service?.name || '').trim())
    .filter(Boolean)
    .map((name) => name.toUpperCase())

  if (serviceNames.length === 0) {
    return 'STATEMENT OF ACCOUNT FOR INSTALLATION, RENOVATION'
  }

  const joined = serviceNames.join(', ')
  return `STATEMENT OF ACCOUNT FOR ${joined} INSTALLATION, RENOVATION`
}

const buildStatementCreatePayload = (body = {}, req = {}) => {
  const services = Array.isArray(body.services) ? body.services : []
  const preparedBy = body.prepared_by || req.session?.user?.fullname || req.context?.fullname || ''

  return {
    company_from: body.company_from,
    company_to: body.company_to,
    date: body.date,
    title: body.title || buildStatementTitle(services),
    headers: body.headers || null,
    sub_total: Number(body.sub_total || 0),
    vat: Number(body.vat || 0),
    total: Number(body.total || 0),
    prepared_by: preparedBy,
  }
}

const parseNumericValue = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0
}

const DEFAULT_VAT_RATE = 0.2

const normalizeFieldName = (value = '') =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

const resolveFieldValue = (values = {}, fieldName = '') => {
  const candidates = [
    String(fieldName ?? '').trim(),
    String(fieldName ?? '')
      .trim()
      .toLowerCase(),
    normalizeFieldName(fieldName),
  ]

  for (const candidate of candidates) {
    if (!candidate) continue
    if (Object.prototype.hasOwnProperty.call(values, candidate)) {
      return values[candidate]
    }
  }

  return 0
}

const buildQuantityLookup = (fieldNames = [], quantityMeta = []) => {
  const normalizedFields = Array.isArray(fieldNames) ? fieldNames.filter(Boolean) : []
  const lookup = new Map()

  const addMapping = (serviceFieldName = '', quantityFieldName = '') => {
    const serviceKey = normalizeFieldName(serviceFieldName)
    const quantityKey = normalizeFieldName(quantityFieldName)
    if (serviceKey && quantityKey && !lookup.has(serviceKey)) {
      lookup.set(serviceKey, quantityKey)
    }
  }

  const metaEntries = Array.isArray(quantityMeta) ? quantityMeta : []
  metaEntries.forEach((entry) => {
    const quantityKey = normalizeFieldName(entry?.key || '')
    const relatedServiceKey = normalizeFieldName(entry?.quantityMeta?.relatedServiceKey || '')
    if (quantityKey && relatedServiceKey) {
      addMapping(relatedServiceKey, quantityKey)
    }
  })

  normalizedFields.forEach((fieldName) => {
    const normalizedField = normalizeFieldName(fieldName)
    if (normalizedField.endsWith('_qty')) {
      const baseField = normalizedField.replace(/_qty$/, '')
      addMapping(baseField, normalizedField)
    }
  })

  return lookup
}

const calculateStatementSaveTotal = (rows = [], fieldNames = [], options = {}) => {
  const normalizedFields = fieldNames.filter(Boolean)
  if (!Array.isArray(rows) || rows.length === 0 || normalizedFields.length === 0) {
    return options?.returnObject ? { subTotal: 0, vat: 0, total: 0 } : 0
  }

  const salesField = normalizedFields.find(
    (fieldName) =>
      /sales/i.test(fieldName) &&
      !/additional/i.test(fieldName) &&
      !/mobilization/i.test(fieldName) &&
      !/total/i.test(fieldName),
  )
  const additionalSalesField = normalizedFields.find(
    (fieldName) => /additional/i.test(fieldName) || /mobilization/i.test(fieldName),
  )
  const serviceFields = normalizedFields.filter((fieldName) => {
    if (!fieldName) return false
    const normalizedField = normalizeFieldName(fieldName)
    if (normalizedField.includes('qty')) return false
    if (/^vat/i.test(normalizedField)) return false
    if (/sales/i.test(normalizedField) && !/additional/i.test(normalizedField)) return false
    if (/additional/i.test(normalizedField) || /mobilization/i.test(normalizedField)) return false
    if (/total/i.test(normalizedField) && /sales/i.test(normalizedField)) return false
    return true
  })

  const vatRate = Number(options.vatRate ?? DEFAULT_VAT_RATE)
  const vatMode = Boolean(options.vatMode)
  const quantityLookup = buildQuantityLookup(normalizedFields, options.quantityMeta)
  const hasQuantityFields = normalizedFields.some((fieldName) =>
    normalizeFieldName(fieldName).includes('qty'),
  )
  const hasQuantityMeta = Array.isArray(options.quantityMeta) && options.quantityMeta.length > 0
  const quantityMode = Boolean(options.quantityMode || hasQuantityFields || hasQuantityMeta)

  const buildRowTotal = (values = {}) => {
    if (serviceFields.length > 0) {
      const serviceTotal = serviceFields.reduce((sum, fieldName) => {
        const normalizedField = normalizeFieldName(fieldName)
        const fieldValue = parseNumericValue(resolveFieldValue(values, fieldName))
        const quantityFieldName = quantityLookup.get(normalizedField)
        const quantityValue = quantityFieldName
          ? parseNumericValue(resolveFieldValue(values, quantityFieldName))
          : 0
        const hasQuantitySelection = Boolean(quantityFieldName)
        const lineTotal = hasQuantitySelection
          ? Number((fieldValue * Math.max(quantityValue, 0)).toFixed(2))
          : Number(fieldValue.toFixed(2))
        return Number((sum + lineTotal).toFixed(2))
      }, 0)
      const additionalValue = additionalSalesField
        ? parseNumericValue(resolveFieldValue(values, additionalSalesField))
        : 0
      return Number((serviceTotal + additionalValue).toFixed(2))
    }

    if (salesField && additionalSalesField) {
      const salesValue = parseNumericValue(resolveFieldValue(values, salesField))
      const additionalValue = parseNumericValue(resolveFieldValue(values, additionalSalesField))
      return Number((salesValue + additionalValue).toFixed(2))
    }

    return normalizedFields.reduce((sum, fieldName) => {
      if (!fieldName) return sum
      const normalizedField = normalizeFieldName(fieldName)
      if (normalizedField.includes('qty')) return sum
      const fieldValue = parseNumericValue(resolveFieldValue(values, fieldName))
      return Number((sum + fieldValue).toFixed(2))
    }, 0)
  }

  const subTotal = rows.reduce((total, row) => {
    const values = row?.values || row || {}
    return Number((total + buildRowTotal(values)).toFixed(2))
  }, 0)

  if (!vatMode && !options?.returnObject && !quantityMode) {
    return Number(subTotal.toFixed(2))
  }

  if (!vatMode) {
    const vat = Number((subTotal * vatRate).toFixed(2))
    return {
      subTotal: Number(subTotal.toFixed(2)),
      vat,
      total: Number((subTotal + vat).toFixed(2)),
    }
  }

  const vat = rows.reduce((total, row) => {
    const values = row?.values || row || {}
    const rowTotal = buildRowTotal(values)
    const rowVat = Number((rowTotal * vatRate).toFixed(2))
    return Number((total + rowVat).toFixed(2))
  }, 0)

  return {
    subTotal: Number(subTotal.toFixed(2)),
    vat: Number(vat.toFixed(2)),
    total: Number((subTotal + vat).toFixed(2)),
  }
}

const formatHeaderLabel = (header = '') =>
  String(header ?? '')
    .trim()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const buildStatementHeaders = (headers = [], options = false) => {
  const normalizedHeaders = Array.isArray(headers) ? headers.filter(Boolean) : []
  const vatMode = Boolean(options?.vatMode ?? options)
  const quantityMode = Boolean(options?.quantityMode)
  const hasQuantityMeta = Array.isArray(options?.quantityMeta) && options.quantityMeta.length > 0
  const selectedQuantityTargets = Array.isArray(options?.quantityMeta)
    ? options.quantityMeta
        .map((entry) => normalizeFieldName(entry?.quantityMeta?.relatedServiceKey || ''))
        .filter(Boolean)
    : []

  const explicitQuantityTargets = new Set(
    normalizedHeaders
      .filter((header) => /^(qty|quantity)\s*\(/i.test(String(header).trim()))
      .map((header) => {
        const quantityTarget =
          String(header)
            .trim()
            .match(/^qty\s*\((.+)\)$/i)?.[1] || ''
        return normalizeFieldName(quantityTarget)
      })
      .filter(Boolean),
  )

  const appendedHeaders = []

  normalizedHeaders.forEach((header) => {
    const formattedHeader = formatHeaderLabel(header)
    const normalizedHeader = normalizeFieldName(header)
    const isQtyHeader =
      /^(qty|quantity)\s*\(/i.test(String(header).trim()) ||
      normalizedHeader === 'qty' ||
      normalizedHeader === 'quantity'

    appendedHeaders.push(formattedHeader)

    const shouldAppendQuantityHeader =
      !isQtyHeader &&
      hasQuantityMeta &&
      selectedQuantityTargets.length > 0 &&
      !explicitQuantityTargets.has(normalizedHeader) &&
      selectedQuantityTargets.includes(normalizedHeader)

    if (shouldAppendQuantityHeader) {
      const quantityHeader = `QTY (${formattedHeader})`
      const alreadyHasHeader = appendedHeaders.includes(quantityHeader)
      if (!alreadyHasHeader) {
        appendedHeaders.push(quantityHeader)
      }
    }
  })

  if (vatMode) appendedHeaders.push('%VAT')

  return appendedHeaders
}

module.exports = {
  buildStatementTitle,
  buildStatementCreatePayload,
  calculateStatementSaveTotal,
  buildStatementHeaders,
}
