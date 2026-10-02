import React, { useEffect, useMemo, useState } from 'react'
import { Edit, Eye, Download, FileText, Table } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import Layout from '../components/Layout'
import DynamicTable from '../components/DynamicTable'
import Modal from '../components/Modal'
import DynamicToast from '../components/DynamicToast'
import LoadingScreen from '../LoadingScreen'
import { apiClient } from '../../api/axios'
import { exportStatementToPdf } from './Statementpdfexport'
import { exportStatementToExcel } from './Statementexcelexport'

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const normalizeServiceId = (service) => String(service?.service_id ?? service?.id ?? '')

const normalizeStoredHeaders = (headers = []) => {
  if (Array.isArray(headers)) {
    return headers.map((header) => {
      if (typeof header === 'object') {
        return String(header.header || header.key || header).trim()
      }
      return String(header ?? '').trim()
    }).filter(Boolean)
  }

  if (typeof headers === 'string') {
    const trimmed = headers.trim()
    if (!trimmed) return []

    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((header) => {
          if (typeof header === 'object') {
            return String(header.header || header.key || header).trim()
          }
          return String(header ?? '').trim()
        }).filter(Boolean)
      }
    } catch {
      // fall back to comma-splitting below
    }

    return trimmed
      .split(',')
      .map((header) => header.trim())
      .filter(Boolean)
  }

  return []
}

const getServiceSummary = (selectedIds = [], availableServices = []) => {
  const selected = availableServices.filter((service) =>
    selectedIds.includes(normalizeServiceId(service)),
  )

  return selected.reduce(
    (acc, service) => {
      acc.total += Number(service.price || 0)
      acc.names.push(String(service.name || '').trim())
      return acc
    },
    { total: 0, names: [] },
  )
}

const buildGeneratedTitle = (selectedIds = [], availableServices = []) => {
  const { names } = getServiceSummary(selectedIds, availableServices)
  return names.length ? `STATEMENT OF ACCOUNT FOR ${names.join(', ')}` : ''
}

const getServiceIdsFromTitle = (title = '', availableServices = []) => {
  if (!title) return []

  const normalizedTitle = String(title).toUpperCase()
  return availableServices
    .filter((service) => {
      const serviceName = String(service.name || '')
        .trim()
        .toUpperCase()
      return serviceName && normalizedTitle.includes(serviceName)
    })
    .map((service) => normalizeServiceId(service))
}

const buildHeadersFromServices = (
  selectedIds = [],
  availableServices = [],
  existingHeaders = [],
  options = {},
) => {
  const selected = availableServices.filter((service) =>
    selectedIds.includes(normalizeServiceId(service)),
  )

  const includeDrNo = options.includeDrNo !== false
  const includeRtNo = options.includeRtNo !== false
  const includeMaterialCost = options.includeMaterialCost !== false
  const staticHeaderStart = ['NO.']
  if (includeDrNo) staticHeaderStart.push('DR NO.')
  if (includeRtNo) staticHeaderStart.push('RT NO.')
  staticHeaderStart.push('STORE NAME', 'STORE NO.', 'DATE')
  const serviceIds = selected.map((service) => normalizeServiceId(service))
  const staticHeaderEnd = []
  if (includeMaterialCost) staticHeaderEnd.push('MATERIAL COST')
  staticHeaderEnd.push('SALES', 'ADDITIONAL SALES (MOBILIZATION)', 'TOTAL SALES')
  const headers = [...staticHeaderStart, ...serviceIds, ...staticHeaderEnd]
  const normalizedExistingHeaders = normalizeStoredHeaders(existingHeaders)
  const hasVatHeader = normalizedExistingHeaders.some(
    (header) =>
      String(header).trim().toLowerCase() === '%vat' ||
      String(header).trim().toLowerCase() === 'vat',
  )

  return hasVatHeader ? [...headers, '%VAT'] : headers
}

const determineStatementTypeFromHeaders = (headers) => {
  if (!headers) return { statement_type: 'SERVICE', maintenance_format: 'REGIONAL_SUMMARY' }

  const normalizedHeaders = normalizeStoredHeaders(headers).map(h => h.toLowerCase())

  // Check for maintenance formats
  const hasArea = normalizedHeaders.some(h => h.includes('area'))
  const hasNoOfStore = normalizedHeaders.some(h => h.includes('no of store') || h.includes('no_of_store'))
  const hasPricePerStore = normalizedHeaders.some(h => h.includes('price per store') || h.includes('price_per_store'))
  const hasTotalAmount = normalizedHeaders.some(h => h.includes('total amount'))

  const hasInvoice = normalizedHeaders.some(h => h.includes('invoice'))
  const hasTicketNumber = normalizedHeaders.some(h => h.includes('ticket') || h.includes('ticket number'))
  const hasPartsDescription = normalizedHeaders.some(h => h.includes('parts') || h.includes('parts description'))
  const hasPartsQty = normalizedHeaders.some(h => h.includes('qty') || h.includes('parts qty'))

  const hasServiceDate = normalizedHeaders.some(h => h.includes('service date'))
  const hasWorkDone = normalizedHeaders.some(h => h.includes('work done'))
  const hasVatEx = normalizedHeaders.some(h => h.includes('vat-ex') || h.includes('vat_ex'))
  const hasVatIn = normalizedHeaders.some(h => h.includes('vat-in') || h.includes('vat_in'))

  // Determine format based on header patterns
  if (hasArea && hasNoOfStore && hasPricePerStore && hasTotalAmount) {
    return { statement_type: 'MAINTENANCE', maintenance_format: 'REGIONAL_SUMMARY' }
  }

  if (hasInvoice && hasTicketNumber && hasPartsDescription && hasPartsQty) {
    return { statement_type: 'MAINTENANCE', maintenance_format: 'ITEMIZED_PARTS' }
  }

  if (hasInvoice && hasServiceDate && hasWorkDone && hasVatEx && hasVatIn) {
    return { statement_type: 'MAINTENANCE', maintenance_format: 'OFFICIAL_INVOICE' }
  }

  // Default to SERVICE if no maintenance pattern matches
  return { statement_type: 'SERVICE', maintenance_format: 'REGIONAL_SUMMARY' }
}

const mapStatement = (item) => {
  const headers = item.soa_headers ?? item.headers ?? null
  const typeFromHeaders = determineStatementTypeFromHeaders(headers)

  return {
    id: item.soa_id ?? item.id,
    company_from: item.soa_company_from ?? item.company_from ?? '',
    company_to: item.soa_company_to ?? item.company_to ?? '',
    date: item.soa_date ?? item.date ?? '',
    title: item.soa_title ?? item.title ?? 'Untitled statement',
    headers: headers,
    sub_total: Number(item.soa_sub_total ?? item.sub_total ?? 0),
    vat: Number(item.soa_vat ?? item.vat ?? 0),
    total: Number(item.soa_total ?? item.total ?? 0),
    prepared_by: item.soa_prepared_by ?? item.prepared_by ?? '',
    // Use database values first, fall back to header inference
    statement_type: item.soa_statement_type ?? item.statement_type ?? typeFromHeaders.statement_type,
    maintenance_format: item.soa_maintenance_format ?? item.maintenance_format ?? typeFromHeaders.maintenance_format,
  }
}

const mapCompanyOption = (item) => {
  const id = item?.mc_id ?? item?.company_id ?? item?.id ?? item?.companyId
  const name = item?.mc_name ?? item?.name ?? item?.company_name ?? item?.companyName

  return {
    id: id ?? '',
    name: name || (id ? `Company ${id}` : 'Unnamed company'),
  }
}

export default function Statement() {
  const [statements, setStatements] = useState([])
  const [companies, setCompanies] = useState([])
  const [services, setServices] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [hoveredRowId, setHoveredRowId] = useState(null)
  const [selectedStatements, setSelectedStatements] = useState(new Set())
  const [form, setForm] = useState({
    company_from: '',
    company_to: '',
    date: '',
    services: [],
    title: '',
    sub_total: '',
    vat: '',
    total: '',
    includeDrNo: true,
    includeRtNo: true,
    includeMaterialCost: true,
    statement_type: 'SERVICE',
    maintenance_format: 'REGIONAL_SUMMARY',
  })
  const [editForm, setEditForm] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  const handleNavigate = () => {}

  const showToast = (type, message) => setToast({ type, message })

  const loadCompanies = async () => {
    try {
      const response = await apiClient.get('/company')
      const companyList = (response.data?.data || []).map((item) => ({
        id: item.mc_id ?? item.company_id ?? item.id ?? item.companyId,
        name: item.mc_name ?? item.name ?? item.company_name ?? item.companyName,
        address:
          item.mc_address ?? item.address ?? item.company_address ?? item.companyAddress ?? '',
        mobile:
          item.mc_mobile_number ?? item.mobile_number ?? item.mobile ?? item.company_mobile ?? '',
        phone:
          item.mc_telephone_number ??
          item.telephone_number ??
          item.phone ??
          item.company_phone ??
          '',
        email:
          item.mc_email ?? item.email ?? item.company_email ?? '',
      })).filter((item) => item.id !== '')
      setCompanies(companyList)
    } catch (err) {
      setError('Unable to load company options at the moment.')
    }
  }

  const loadServices = async () => {
    try {
      const response = await apiClient.get('/service')
      const serviceList = Array.isArray(response.data?.data) ? response.data.data : []
      setServices(serviceList)
    } catch (err) {
      setServices([])
    }
  }

  const loadStatements = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/statement')
      setStatements((response.data?.data || []).map(mapStatement))
      setError('')
    } catch (err) {
      setError('Unable to load statement records at the moment.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const currentDate = new Date()
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const day = String(currentDate.getDate()).padStart(2, '0')

    setForm((prev) => ({
      ...prev,
      date: `${year}-${month}-${day}`,
    }))

    loadCompanies()
    loadServices()
    loadStatements()
  }, [location.pathname])

  const handleEditClick = (row) => {
    const normalizedRowHeaders = normalizeStoredHeaders(row.headers ?? null)
    const normalizeHeaderKey = (header = '') =>
      String(header ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
    const hasDrNo = normalizedRowHeaders.some((header) => normalizeHeaderKey(header) === 'drno')
    const hasRtNo = normalizedRowHeaders.some((header) => normalizeHeaderKey(header) === 'rtno')
    const hasMaterialCost = normalizedRowHeaders.some((header) => normalizeHeaderKey(header) === 'materialcost')

    // Use the statement_type and maintenance_format from the row (already determined by mapStatement)
    setEditForm({
      id: row.id,
      company_from: String(row.company_from || ''),
      company_to: String(row.company_to || ''),
      date: row.date || '',
      title: row.title || '',
      services: getServiceIdsFromTitle(row.title || '', services),
      existingHeaders: row.headers ?? null,
      includeDrNo: hasDrNo,
      includeRtNo: hasRtNo,
      includeMaterialCost: hasMaterialCost,
      statement_type: row.statement_type || 'SERVICE',
      maintenance_format: row.maintenance_format || 'REGIONAL_SUMMARY',
    })
    setEditModalOpen(true)
  }

  const handleAddStatement = async (e) => {
    e.preventDefault()
    try {
      let headers = []
      let title = form.title
      
      if (form.statement_type === 'SERVICE') {
        headers = buildHeadersFromServices(form.services, services, [], {
          includeDrNo: form.includeDrNo,
          includeRtNo: form.includeRtNo,
          includeMaterialCost: form.includeMaterialCost,
        })
        title = form.title || generatedTitle
      } else {
        // Maintenance headers based on format
        if (form.maintenance_format === 'REGIONAL_SUMMARY') {
          headers = ['AREA', 'NO OF STORE', 'PRICE PER STORE', 'TOTAL AMOUNT']
          title = form.title || 'CCTV MAINTENANCE BILLING - REGIONAL SUMMARY'
        } else if (form.maintenance_format === 'ITEMIZED_PARTS') {
          headers = ['INVOICE', 'STORE NUMBER', 'STORE NAME', 'TICKET NUMBER', 'DESCRIPTION', 'SERVICES DATE', 'WORK DONE', 'PARTS DESCRIPTION', 'PARTS QTY.', 'PRICE', 'SUBTOTAL', 'TOTAL INVOICE AMOUNT']
          title = form.title || 'CCTV MAINTENANCE BILLING - ITEMIZED PARTS'
        } else if (form.maintenance_format === 'OFFICIAL_INVOICE') {
          headers = ['NO', 'INVOICE', 'SERVICE DATE', 'AREA', 'SERVICE TYPE', 'WORK DONE', 'NO OF STORE', 'AMOUNT PER STORE', 'TOTAL VAT-EX', 'TOTAL VAT-IN']
          title = form.title || 'CCTV MAINTENANCE BILLING - OFFICIAL INVOICE'
        }
      }
      
      const payload = {
        company_from: Number(form.company_from),
        company_to: Number(form.company_to),
        date: form.date,
        services: form.statement_type === 'SERVICE' ? form.services : [],
        title: title,
        headers: JSON.stringify(headers),
        sub_total: form.sub_total === '' ? null : Number(form.sub_total),
        vat: form.vat === '' ? null : Number(form.vat),
        total: form.total === '' ? null : Number(form.total),
        statement_type: form.statement_type,
        maintenance_format: form.maintenance_format,
      }
      const response = await apiClient.post('/statement', payload)
      showToast('success', response.data?.message || 'Statement created successfully.')
      const createdStatement = response.data?.data || payload
      const createdId = createdStatement?.soa_id ?? createdStatement?.id ?? response.data?.id

      setStatements((prev) => [mapStatement(createdStatement), ...prev])
      setModalOpen(false)
      const currentDate = new Date()
      const year = currentDate.getFullYear()
      const month = String(currentDate.getMonth() + 1).padStart(2, '0')
      const day = String(currentDate.getDate()).padStart(2, '0')
      setForm({
        company_from: '',
        company_to: '',
        date: `${year}-${month}-${day}`,
        services: [],
        title: '',
        sub_total: '',
        vat: '',
        total: '',
        includeDrNo: true,
        includeRtNo: true,
        includeMaterialCost: true,
        statement_type: 'SERVICE',
        maintenance_format: 'REGIONAL_SUMMARY',
      })
      setError('')
      if (createdId) {
        navigate({
          to: '/statement/$id',
          params: { id: String(createdId) },
        })
      }
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Unable to create statement record.')
      setError(err?.response?.data?.message || 'Unable to create statement record.')
    }
  }

  const handleUpdateStatement = async (e) => {
    e.preventDefault()
    if (!editForm?.id) return
    try {
      let headers = []
      let title = editForm.title
      
      if (editForm.statement_type === 'SERVICE') {
        headers = buildHeadersFromServices(
          editForm.services || [],
          services,
          editForm.existingHeaders ?? editForm.headers ?? null,
          {
            includeDrNo: editForm.includeDrNo,
            includeRtNo: editForm.includeRtNo,
            includeMaterialCost: editForm.includeMaterialCost,
          },
        )
        title = editForm.title || buildGeneratedTitle(editForm.services || [], services)
      } else {
        // Maintenance headers based on format
        if (editForm.maintenance_format === 'REGIONAL_SUMMARY') {
          headers = ['AREA', 'NO OF STORE', 'PRICE PER STORE', 'TOTAL AMOUNT']
          title = editForm.title || 'CCTV MAINTENANCE BILLING - REGIONAL SUMMARY'
        } else if (editForm.maintenance_format === 'ITEMIZED_PARTS') {
          headers = ['INVOICE', 'STORE NUMBER', 'STORE NAME', 'TICKET NUMBER', 'DESCRIPTION', 'SERVICES DATE', 'WORK DONE', 'PARTS DESCRIPTION', 'PARTS QTY.', 'PRICE', 'SUBTOTAL', 'TOTAL INVOICE AMOUNT']
          title = editForm.title || 'CCTV MAINTENANCE BILLING - ITEMIZED PARTS'
        } else if (editForm.maintenance_format === 'OFFICIAL_INVOICE') {
          headers = ['NO', 'INVOICE', 'SERVICE DATE', 'AREA', 'SERVICE TYPE', 'WORK DONE', 'NO OF STORE', 'AMOUNT PER STORE', 'TOTAL VAT-EX', 'TOTAL VAT-IN']
          title = editForm.title || 'CCTV MAINTENANCE BILLING - OFFICIAL INVOICE'
        }
      }
      
      const payload = {
        company_from: Number(editForm.company_from),
        company_to: Number(editForm.company_to),
        date: editForm.date,
        title: title,
        headers: JSON.stringify(headers),
        statement_type: editForm.statement_type,
        maintenance_format: editForm.maintenance_format,
      }
      const response = await apiClient.put(`/statement/${editForm.id}`, payload)
      showToast('success', response.data?.message || 'Statement updated successfully.')
      const updated = mapStatement(response.data?.data || { soa_id: editForm.id, ...payload })
      setStatements((prev) => prev.map((item) => (item.id === editForm.id ? updated : item)))
      setEditModalOpen(false)
      setEditForm(null)
      setError('')
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Unable to update statement record.')
      setError(err?.response?.data?.message || 'Unable to update statement record.')
    }
  }

  const companyMap = useMemo(() => {
    const map = {}
    companies.forEach((company) => {
      if (company.id) {
        map[company.id] = {
          name: company.name || company.id,
          address: company.address || '',
          mobile: company.mobile || '',
          phone: company.phone || '',
          email: company.email || '',
        }
      }
    })
    return map
  }, [companies])

  const selectedServiceSummary = useMemo(
    () => getServiceSummary(form.services, services),
    [form.services, services],
  )

  const generatedTitle = useMemo(
    () => buildGeneratedTitle(form.services, services),
    [form.services, services],
  )

  const editGeneratedTitle = useMemo(
    () => buildGeneratedTitle(editForm?.services || [], services),
    [editForm?.services, services],
  )

  const filteredStatements = useMemo(() => {
    return statements.filter((statement) => {
      const fromCompanyName = companyMap[statement.company_from]?.name || String(statement.company_from)
      const toCompanyName = companyMap[statement.company_to]?.name || String(statement.company_to)
      
      const matchesSearch =
        statement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(statement.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
        statement.prepared_by.toLowerCase().includes(searchQuery.toLowerCase()) ||
        statement.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fromCompanyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        toCompanyName.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesSearch
    })
  }, [statements, searchQuery, companyMap])

  const metrics = useMemo(() => {
    const total = filteredStatements.length
    const totalValue = filteredStatements.reduce((acc, curr) => acc + curr.total, 0)
    return { total, totalValue }
  }, [filteredStatements])

  const handleBulkPdfExport = async () => {
    if (selectedStatements.size === 0) {
      showToast('error', 'Please select at least one statement to export.')
      return
    }

    try {
      const selectedIds = Array.from(selectedStatements)
      const selectedData = statements.filter((s) => selectedIds.includes(s.id))

      // Fetch detailed data for each selected statement
      const statementDetails = await Promise.all(
        selectedData.map(async (statement) => {
          try {
            const response = await apiClient.get(`/statement/${statement.id}/items`)
            console.log(`Statement ${statement.id} (${statement.title}) items response:`, response.data)
            const data = response.data?.data || response.data || []
            const rows = Array.isArray(data) ? data : (data.rows || data.items || [])
            console.log(`Statement ${statement.id} has ${rows.length} rows`)
            return {
              ...statement,
              details: data,
              rows: rows,
              columns: data.columns || [],
            }
          } catch (err) {
            console.error(`Failed to fetch details for statement ${statement.id}:`, err)
            return { ...statement, details: null, rows: [], columns: [] }
          }
        })
      )

      // Use pdf-lib to merge multiple PDFs into one
      const { PDFDocument } = await import('pdf-lib')
      const mergedPdf = await PDFDocument.create()

      for (const stmt of statementDetails) {
        try {
          // Determine maintenance format from headers or statement
          const typeFromHeaders = determineStatementTypeFromHeaders(stmt.headers || stmt.details?.soa_headers)
          const maintenanceFormat = stmt.maintenance_format || typeFromHeaders.maintenance_format

          // For Regional Summary (Area-based) maintenance, use fixed columns
          let columns
          if (typeFromHeaders.statement_type === 'MAINTENANCE' && maintenanceFormat === 'REGIONAL_SUMMARY') {
            columns = [
              { key: 'area', header: 'AREA', align: 'left' },
              { key: 'noOfStore', header: 'NO OF STORE', align: 'left' },
              { key: 'pricePerStore', header: 'PRICE PER STORE', align: 'left' },
              { key: 'totalAmount', header: 'TOTAL AMOUNT', align: 'left' },
            ]
          } else {
            const headers = normalizeStoredHeaders(stmt.headers || stmt.details?.soa_headers)
            columns = headers.map((h, idx) => ({
              key: String(h).toLowerCase().replace(/[^a-z0-9]/g, '_'),
              header: h,
            }))
          }

          // Transform rows to match expected format for PDF export
          const rawRows = stmt.rows || stmt.details?.rows || []
          console.log(`Statement ${stmt.id} raw rows:`, rawRows)
          const rows = rawRows.map(row => {
            // If row has values property, use it; otherwise use row directly
            const values = row.values || row
            console.log(`Row values:`, values)
            return {
              id: row.id || `row-${Math.random()}`,
              values: values,
              color: row.color || null,
              parts: row.parts || values.parts, // Preserve parts array for multi-row items
            }
          })

          const documentMeta = {
            fromCompany: companyMap[stmt.company_from] || { name: String(stmt.company_from) },
            toCompany: companyMap[stmt.company_to] || { name: String(stmt.company_to) },
            title: stmt.title,
            date: stmt.date,
            subTotal: stmt.sub_total,
            vat: stmt.vat,
            total: stmt.total,
          }

          const totals = {
            subTotal: stmt.sub_total,
            vat: stmt.vat,
            total: stmt.total,
          }

          // Generate PDF for this statement
          const blob = await exportStatementToPdf({
            columns,
            rows,
            documentMeta,
            statementId: stmt.id,
            totals,
          })

          // Load the generated PDF and copy its pages to the merged PDF
          const arrayBuffer = await blob.arrayBuffer()
          const stmtPdf = await PDFDocument.load(arrayBuffer)
          const copiedPages = await mergedPdf.copyPages(stmtPdf, stmtPdf.getPageIndices())
          copiedPages.forEach((page) => mergedPdf.addPage(page))
        } catch (err) {
          console.error(`Failed to export statement ${stmt.id}:`, err)
        }
      }

      // Download the merged PDF
      const mergedPdfBytes = await mergedPdf.save()
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bulk-statements-export-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showToast('success', `Exported ${selectedStatements.size} statement(s) to PDF.`)
    } catch (err) {
      console.error('Bulk PDF export failed:', err)
      showToast('error', 'Failed to export statements to PDF.')
    }
  }

  const handleBulkExcelExport = async () => {
    if (selectedStatements.size === 0) {
      showToast('error', 'Please select at least one statement to export.')
      return
    }

    try {
      const selectedIds = Array.from(selectedStatements)
      const selectedData = statements.filter((s) => selectedIds.includes(s.id))

      // Create Excel with multiple tabs using ExcelJS
      const ExcelJS = (await import('exceljs')).default
      const workbook = new ExcelJS.Workbook()

      // Add logo to workbook once and cache the image ID for reuse
      let cachedImageId = null
      try {
        const logoResponse = await fetch(new URL('../../../assets/logo.png', import.meta.url))
        const logoBlob = await logoResponse.blob()
        const logoDataUrl = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.readAsDataURL(logoBlob)
        })
        cachedImageId = workbook.addImage({ base64: logoDataUrl, extension: 'png' })
        console.log('Logo added to workbook with ID:', cachedImageId)
      } catch (error) {
        console.error('Failed to add logo to workbook:', error)
      }

      // Process each statement independently
      const sheetNameTracker = new Set() // Track used sheet names to avoid duplicates
      
      for (const statement of selectedData) {
        try {
          console.log(`Processing statement ${statement.id}: ${statement.title}`)

          // Fetch detailed data for this statement
          const response = await apiClient.get(`/statement/${statement.id}/items`)
          console.log(`Statement ${statement.id} API response:`, response.data)

          const data = response.data?.data || response.data || []
          const rawRows = Array.isArray(data) ? data : (data.rows || data.items || [])
          console.log(`Statement ${statement.id} has ${rawRows.length} raw rows`)
          
          // Log first row structure for debugging
          if (rawRows.length > 0) {
            console.log(`Statement ${statement.id} first row structure:`, JSON.stringify(rawRows[0], null, 2))
          }
          
          // Validate that we have rows before proceeding
          if (!rawRows || rawRows.length === 0) {
            console.warn(`Statement ${statement.id} has no rows, creating empty sheet`)
            // Still create the sheet even if empty
          }

          // Transform rows to match expected format for Excel export
          const rows = rawRows.map(row => {
            const values = row.values || row
            // Ensure the row object has all necessary properties
            return {
              id: row.id || `row-${Math.random()}`,
              values: values,
              color: row.color || null,
              parts: row.parts || values.parts, // Preserve parts array for multi-row items
            }
          })

          // Determine maintenance format from headers or statement
          const typeFromHeaders = determineStatementTypeFromHeaders(statement.headers || data.headers)
          const maintenanceFormat = statement.maintenance_format || typeFromHeaders.maintenance_format

          // For Regional Summary (Area-based) maintenance, use fixed columns
          let columns
          if (typeFromHeaders.statement_type === 'MAINTENANCE' && maintenanceFormat === 'REGIONAL_SUMMARY') {
            columns = [
              { key: 'area', header: 'AREA', align: 'left' },
              { key: 'noOfStore', header: 'NO OF STORE', align: 'left' },
              { key: 'pricePerStore', header: 'PRICE PER STORE', align: 'left' },
              { key: 'totalAmount', header: 'TOTAL AMOUNT', align: 'left' },
            ]
          } else {
            const headers = normalizeStoredHeaders(statement.headers || data.headers)
            columns = headers.map((h, idx) => ({
              key: String(h).toLowerCase().replace(/[^a-z0-9]/g, '_'),
              header: h,
            }))
          }

          const documentMeta = {
            fromCompany: companyMap[statement.company_from] || { name: String(statement.company_from) },
            toCompany: companyMap[statement.company_to] || { name: String(statement.company_to) },
            title: statement.title,
            date: statement.date,
            subTotal: statement.sub_total,
            vat: statement.vat,
            total: statement.total,
          }

          const totals = {
            subTotal: statement.sub_total,
            vat: statement.vat,
            total: statement.total,
          }

          // Create a unique worksheet name for this statement
          let safeTitle = statement.title.replace(/[^a-z0-9]/gi, '_').substring(0, 20)
          let sheetName = safeTitle.substring(0, 31) || `SOA-${statement.id}`
          
          // Ensure sheet name is unique
          let counter = 1
          let uniqueSheetName = sheetName
          while (sheetNameTracker.has(uniqueSheetName)) {
            uniqueSheetName = `${sheetName.substring(0, 28)}_${counter}`
            counter++
          }
          sheetNameTracker.add(uniqueSheetName)
          
          console.log(`Creating worksheet "${uniqueSheetName}" with ${rows.length} rows`)

          await exportStatementToExcel({
            columns,
            rows,
            documentMeta,
            statementId: statement.id,
            filename: null, // Don't download immediately
            totals,
            workbook, // Pass the workbook to add sheet
            sheetName: uniqueSheetName,
            cachedImageId, // Pass cached logo image ID
            skipLogo: false, // Don't skip logo - we're using cached image
            maintenanceFormat: statement.maintenance_format, // Pass maintenance format
          })

          console.log(`Successfully created worksheet for statement ${statement.id}`)
        } catch (err) {
          console.error(`Failed to export statement ${statement.id}:`, err)
          console.error('Error details:', err.response?.data || err.message)
          console.error('Full error stack:', err.stack)
          // Continue with next statement even if this one fails
        }
      }

      // Download the workbook
      console.log('Writing workbook to buffer...')
      console.log(`Total worksheets in workbook: ${workbook.worksheets.length}`)
      workbook.worksheets.forEach((ws, idx) => {
        console.log(`  Worksheet ${idx + 1}: "${ws.name}"`)
      })
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bulk-statements-export-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showToast('success', `Exported ${workbook.worksheets.length} statement(s) to Excel.`)
    } catch (err) {
      console.error('Bulk Excel export failed:', err)
      showToast('error', 'Failed to export statements to Excel.')
    }
  }

  const isStatementDetailRoute =
    location.pathname !== '/statement' && location.pathname.startsWith('/statement/')

  if (isStatementDetailRoute) {
    return <Outlet />
  }

  const baseColumns = [
    {
      header: '',
      key: 'select',
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedStatements.has(row.id)}
          onChange={(e) => {
            const newSelected = new Set(selectedStatements)
            if (e.target.checked) {
              newSelected.add(row.id)
            } else {
              newSelected.delete(row.id)
            }
            setSelectedStatements(newSelected)
          }}
          className="cursor-pointer"
        />
      ),
    },
    {
      header: 'ID',
      key: 'id',
      render: (row) => (
        <div className="font-mono text-[11px] font-bold text-gray-500">{row.id}</div>
      ),
    },
    {
      header: 'Title',
      key: 'title',
      render: (row) => (
        <div className="font-bold text-black max-w-[300px] truncate" title={row.title}>
          {row.title}
        </div>
      ),
    },
    {
      header: 'Company From',
      key: 'company_from',
      render: (row) => (
        <div className="text-neutral-500 max-w-[200px] truncate" title={companyMap[row.company_from]?.name || row.company_from}>
          {companyMap[row.company_from]?.name || row.company_from}
        </div>
      ),
    },
    {
      header: 'Company To',
      key: 'company_to',
      render: (row) => (
        <div className="text-neutral-500 max-w-[200px] truncate" title={companyMap[row.company_to]?.name || row.company_to}>
          {companyMap[row.company_to]?.name || row.company_to}
        </div>
      ),
    },
    {
      header: 'Date',
      key: 'date',
      render: (row) => <div className="text-neutral-500">{row.date}</div>,
    },
    {
      header: 'Prepared By',
      key: 'prepared_by',
      render: (row) => <div className="text-neutral-500">{row.prepared_by}</div>,
    },
    {
      header: 'Total',
      key: 'total',
      align: 'right',
      render: (row) => <div className="font-bold text-black">{formatCurrency(row.total)}</div>,
    },
  ]

  const actionsColumn = {
    header: 'Actions',
    key: 'actions',
    align: 'center',
    render: (row) => (
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => {
            navigate({ to: '/statement/$id', params: { id: String(row.id) } })
          }}
          aria-label="View"
          title="View"
          className="rounded border border-gray-200 bg-white p-2 text-green-600 hover:bg-green-50"
        >
          <Eye size={16} strokeWidth={1.5} />
        </button>
        <button
          onClick={() => handleEditClick(row)}
          aria-label="Edit"
          title="Edit"
          className="rounded border border-gray-200 bg-white p-2 text-blue-600 hover:bg-blue-50"
        >
          <Edit size={16} strokeWidth={1.5} />
        </button>
      </div>
    ),
  }

  const columns = [...baseColumns, actionsColumn]

  return (
    <Layout
      activeItem="statement"
      title="Statement of Accounts"
      user={{ name: 'Administrator', role: 'Admin', initials: 'AD' }}
      onNavigate={handleNavigate}
      notificationCount={3}
    >
      {loading ? (
        <LoadingScreen label="Loading Statements" subLabel="Fetching statement data..." />
      ) : (
        <>
      <div className="mx-auto flex flex-col h-auto overflow-visible lg:h-[calc(100vh-110px)] space-y-4 lg:overflow-hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:shrink-0">
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
              <span>Masters</span>
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="text-red-600">Statement</span>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-black text-white ring-1 ring-neutral-900">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-black">
                  Statement of Accounts
                </h2>
                <p className="text-xs text-gray-500">
                  Track statement records, billing summaries, and document preparation details.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            {selectedStatements.size > 0 && (
              <>
                <button
                  onClick={handleBulkPdfExport}
                  className="inline-flex items-center gap-2 rounded border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-red-700 transition-colors duration-150 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  <FileText size={16} />
                  Export PDF ({selectedStatements.size})
                </button>
                <button
                  onClick={handleBulkExcelExport}
                  className="inline-flex items-center gap-2 rounded border border-green-200 bg-green-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-green-700 transition-colors duration-150 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                >
                  <Table size={16} />
                  Export Excel ({selectedStatements.size})
                </button>
              </>
            )}
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded bg-black px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors duration-150 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              <svg
                className="h-4 w-4 stroke-[2.5]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Statement
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:shrink-0">
          <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Total Statements
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-black">{metrics.total}</span>
              <span className="text-[10px] font-medium text-gray-400">records</span>
            </div>
          </div>
          <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Total Value
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-red-600">
                {formatCurrency(metrics.totalValue)}
              </span>
              <span className="text-[10px] font-medium text-gray-400">
                across filtered statements
              </span>
            </div>
          </div>
        </div>

        <DynamicTable
          data={filteredStatements}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          searchFields={['title', 'prepared_by', 'date', 'company_from', 'company_to']}
          columns={columns}
          registryLabel="Statement Ledger Registry"
          footerLabel="Statement-of-Account Tracking Secure"
          footerMeta="Active Billing Documentation"
          onRowHover={setHoveredRowId}
          onRowLeave={() => setHoveredRowId(null)}
          showActionsColumn={!!hoveredRowId}
        />
      </div>
      {toast ? (
        <DynamicToast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
          duration={4000}
        />
      ) : null}
      {error ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <Modal open={modalOpen} title="Add Statement" onClose={() => setModalOpen(false)}>
        <form className="space-y-4" onSubmit={handleAddStatement}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Company From
              </label>
              <select
                required
                value={form.company_from}
                onChange={(e) => setForm((prev) => ({ ...prev, company_from: e.target.value }))}
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Company To
              </label>
              <select
                required
                value={form.company_to}
                onChange={(e) => setForm((prev) => ({ ...prev, company_to: e.target.value }))}
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Statement Date
            </label>
            <input
              required
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Statement Type
            </label>
            <select
              required
              value={form.statement_type}
              onChange={(e) => setForm((prev) => ({ ...prev, statement_type: e.target.value }))}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="SERVICE">Service</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>
          {form.statement_type === 'SERVICE' && (
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Services
            </label>
            <div className="max-h-48 space-y-2 overflow-auto rounded border border-gray-200 p-2">
              {services.length === 0 ? (
                <div className="text-sm text-gray-500">No services available.</div>
              ) : (
                services.map((service) => {
                  const serviceId = normalizeServiceId(service)
                  const isSelected = form.services.includes(serviceId)
                  return (
                    <label
                      key={serviceId}
                      className="flex cursor-pointer items-center justify-between rounded border border-gray-100 px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <span className="font-medium text-gray-700">{service.name}</span>
                      <input
                        type="checkbox"
                        value={serviceId}
                        checked={isSelected}
                        onChange={() => {
                          setForm((prev) => ({
                            ...prev,
                            services: isSelected
                              ? prev.services.filter((item) => item !== serviceId)
                              : [...prev.services, serviceId],
                          }))
                        }}
                      />
                    </label>
                  )
                })
              )}
            </div>
          </div>
          )}
          {form.statement_type === 'SERVICE' && (
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex items-center gap-3 rounded border border-gray-200 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.includeDrNo}
                onChange={(e) => setForm((prev) => ({ ...prev, includeDrNo: e.target.checked }))}
              />
              <span className="text-sm text-gray-700">Include DR NO.</span>
            </label>
            <label className="flex items-center gap-3 rounded border border-gray-200 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.includeRtNo}
                onChange={(e) => setForm((prev) => ({ ...prev, includeRtNo: e.target.checked }))}
              />
              <span className="text-sm text-gray-700">Include RT NO.</span>
            </label>
            <label className="flex items-center gap-3 rounded border border-gray-200 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.includeMaterialCost}
                onChange={(e) => setForm((prev) => ({ ...prev, includeMaterialCost: e.target.checked }))}
              />
              <span className="text-sm text-gray-700">Include Material Cost</span>
            </label>
          </div>
          )}
          {form.statement_type === 'SERVICE' && (
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Title
            </label>
            <input
              value={form.title || generatedTitle}
              onChange={(e) => {
                setForm((prev) => ({
                  ...prev,
                  title: e.target.value,
                }))
              }}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
              placeholder="Enter statement title"
            />
          </div>
          )}
          {form.statement_type === 'MAINTENANCE' && (
          <>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Maintenance Format
            </label>
            <select
              required
              value={form.maintenance_format}
              onChange={(e) => setForm((prev) => ({ ...prev, maintenance_format: e.target.value }))}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="REGIONAL_SUMMARY">Regional Summary (Area-based)</option>
              <option value="ITEMIZED_PARTS">Itemized Parts & Repair</option>
              <option value="OFFICIAL_INVOICE">Official Invoice</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Title
            </label>
            <input
              value={form.title}
              onChange={(e) => {
                setForm((prev) => ({
                  ...prev,
                  title: e.target.value,
                }))
              }}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
              placeholder="Enter statement title"
            />
          </div>
          </>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded border border-gray-200 px-3 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-black px-3 py-2 text-sm font-semibold text-white"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>
      <Modal open={editModalOpen} title="Edit Statement" onClose={() => setEditModalOpen(false)}>
        {editForm ? (
          <form className="space-y-4" onSubmit={handleUpdateStatement}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Company From
                </label>
                <select
                  required
                  value={editForm.company_from}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, company_from: e.target.value }))
                  }
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="">Select company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Company To
                </label>
                <select
                  required
                  value={editForm.company_to}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, company_to: e.target.value }))}
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="">Select company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Statement Date
              </label>
              <input
                required
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Statement Type
              </label>
              <select
                required
                value={editForm.statement_type}
                onChange={(e) => setEditForm((prev) => ({ ...prev, statement_type: e.target.value }))}
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="SERVICE">Service</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>
            {editForm.statement_type === 'SERVICE' && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Services
              </label>
              <div className="max-h-48 space-y-2 overflow-auto rounded border border-gray-200 p-2">
                {services.length === 0 ? (
                  <div className="text-sm text-gray-500">No services available.</div>
                ) : (
                  services.map((service) => {
                    const serviceId = normalizeServiceId(service)
                    const isSelected = editForm.services.includes(serviceId)
                    return (
                      <label
                        key={serviceId}
                        className="flex cursor-pointer items-center justify-between rounded border border-gray-100 px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        <span className="font-medium text-gray-700">{service.name}</span>
                        <input
                          type="checkbox"
                          value={serviceId}
                          checked={isSelected}
                          onChange={() => {
                            const newServices = isSelected
                              ? editForm.services.filter((item) => item !== serviceId)
                              : [...editForm.services, serviceId]
                            const newTitle = buildGeneratedTitle(newServices, services)
                            setEditForm((prev) => ({
                              ...prev,
                              services: newServices,
                              title: newTitle,
                            }))
                          }}
                        />
                      </label>
                    )
                  })
                )}
              </div>
            </div>
            )}
            {editForm.statement_type === 'SERVICE' && (
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex items-center gap-3 rounded border border-gray-200 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.includeDrNo}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, includeDrNo: e.target.checked }))}
                />
                <span className="text-sm text-gray-700">Include DR NO.</span>
              </label>
              <label className="flex items-center gap-3 rounded border border-gray-200 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.includeRtNo}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, includeRtNo: e.target.checked }))}
                />
                <span className="text-sm text-gray-700">Include RT NO.</span>
              </label>
              <label className="flex items-center gap-3 rounded border border-gray-200 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.includeMaterialCost}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, includeMaterialCost: e.target.checked }))}
                />
                <span className="text-sm text-gray-700">Include Material Cost</span>
              </label>
            </div>
            )}
            {editForm.statement_type === 'SERVICE' && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Title
              </label>
              <input
                value={editForm.title || editGeneratedTitle}
                onChange={(e) => {
                  setEditForm((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }}
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
                placeholder="Enter statement title"
              />
            </div>
            )}
            {editForm.statement_type === 'MAINTENANCE' && (
            <>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Maintenance Format
              </label>
              <select
                required
                value={editForm.maintenance_format}
                onChange={(e) => setEditForm((prev) => ({ ...prev, maintenance_format: e.target.value }))}
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="REGIONAL_SUMMARY">Regional Summary (Area-based)</option>
                <option value="ITEMIZED_PARTS">Itemized Parts & Repair</option>
                <option value="OFFICIAL_INVOICE">Official Invoice</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Title
              </label>
              <input
                value={editForm.title}
                onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            </>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="rounded border border-gray-200 px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded bg-black px-3 py-2 text-sm font-semibold text-white"
              >
                Save
              </button>
            </div>
          </form>
        ) : null}
      </Modal>
      </>
      )}
    </Layout>
  )
}
