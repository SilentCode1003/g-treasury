import React, { useEffect, useMemo, useState } from 'react'
import { Edit, Eye } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import Layout from '../components/Layout'
import DynamicTable from '../components/DynamicTable'
import Modal from '../components/Modal'
import DynamicToast from '../components/DynamicToast'
import { apiClient } from '../../api/axios'

const MONTH_OPTIONS = [
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

const formatMonthLabel = (value) => {
  if (!value) return ''

  const [month, year] = value.split('-')
  if (!month || !year) return value

  const monthIndex = Number(month) - 1
  const monthName = MONTH_OPTIONS[monthIndex] || month
  return `${monthName} ${year}`
}

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
    return headers.map((header) => String(header ?? '').trim()).filter(Boolean)
  }

  if (typeof headers === 'string') {
    const trimmed = headers.trim()
    if (!trimmed) return []

    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((header) => String(header ?? '').trim()).filter(Boolean)
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
  const staticHeaderStart = ['NO.']
  if (includeDrNo) staticHeaderStart.push('DR NO.')
  if (includeRtNo) staticHeaderStart.push('RT NO.')
  staticHeaderStart.push('STORE NAME', 'STORE NO.', 'DATE')
  const serviceIds = selected.map((service) => normalizeServiceId(service))
  const staticHeaderEnd = ['SALES', 'ADDITIONAL SALES (MOBILIZATION)', 'TOTAL SALES']
  const headers = [...staticHeaderStart, ...serviceIds, ...staticHeaderEnd]
  const normalizedExistingHeaders = normalizeStoredHeaders(existingHeaders)
  const hasVatHeader = normalizedExistingHeaders.some(
    (header) =>
      String(header).trim().toLowerCase() === '%vat' ||
      String(header).trim().toLowerCase() === 'vat',
  )

  return hasVatHeader ? [...headers, '%VAT'] : headers
}

const mapStatement = (item) => ({
  id: item.soa_id ?? item.id,
  company_from: item.soa_company_from ?? item.company_from ?? '',
  company_to: item.soa_company_to ?? item.company_to ?? '',
  date: item.soa_date ?? item.date ?? '',
  title: item.soa_title ?? item.title ?? 'Untitled statement',
  headers: item.soa_headers ?? item.headers ?? null,
  sub_total: Number(item.soa_sub_total ?? item.sub_total ?? 0),
  vat: Number(item.soa_vat ?? item.vat ?? 0),
  total: Number(item.soa_total ?? item.total ?? 0),
  prepared_by: item.soa_prepared_by ?? item.prepared_by ?? '',
})

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
  const [form, setForm] = useState({
    company_from: '',
    company_to: '',
    date: '',
    date_month: '',
    date_year: '',
    services: [],
    title: '',
    sub_total: '',
    vat: '',
    total: '',
    includeDrNo: true,
    includeRtNo: true,
  })
  const [editForm, setEditForm] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  const handleNavigate = () => {}

  const showToast = (type, message) => setToast({ type, message })

  const loadCompanies = async () => {
    try {
      const response = await apiClient.get('/company')
      const companyList = (response.data?.data || [])
        .map(mapCompanyOption)
        .filter((item) => item.id !== '')
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
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const year = currentDate.getFullYear()

    setForm((prev) => ({
      ...prev,
      date: `${month}-${year}`,
      date_month: month,
      date_year: String(year),
    }))

    loadCompanies()
    loadServices()
    loadStatements()
  }, [])

  const handleEditClick = (row) => {
    const [month, year] = String(row.date || '').split('-')

    const normalizedRowHeaders = normalizeStoredHeaders(row.headers ?? null)
    const normalizeHeaderKey = (header = '') =>
      String(header ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
    const hasDrNo = normalizedRowHeaders.some((header) => normalizeHeaderKey(header) === 'drno')
    const hasRtNo = normalizedRowHeaders.some((header) => normalizeHeaderKey(header) === 'rtno')

    setEditForm({
      id: row.id,
      company_from: String(row.company_from || ''),
      company_to: String(row.company_to || ''),
      date: row.date || '',
      date_month: month || '',
      date_year: year || '',
      title: row.title || '',
      services: getServiceIdsFromTitle(row.title || '', services),
      existingHeaders: row.headers ?? null,
      includeDrNo: hasDrNo,
      includeRtNo: hasRtNo,
    })
    setEditModalOpen(true)
  }

  const handleAddStatement = async (e) => {
    e.preventDefault()
    try {
      const headers = buildHeadersFromServices(form.services, services, [], {
        includeDrNo: form.includeDrNo,
        includeRtNo: form.includeRtNo,
      })
      const payload = {
        company_from: Number(form.company_from),
        company_to: Number(form.company_to),
        date: form.date,
        services: form.services,
        title: form.title || generatedTitle,
        headers: JSON.stringify(headers),
        sub_total: form.sub_total === '' ? null : Number(form.sub_total),
        vat: form.vat === '' ? null : Number(form.vat),
        total: form.total === '' ? null : Number(form.total),
      }
      const response = await apiClient.post('/statement', payload)
      showToast('success', response.data?.message || 'Statement created successfully.')
      const createdStatement = response.data?.data || payload
      const createdId = createdStatement?.soa_id ?? createdStatement?.id ?? response.data?.id

      setStatements((prev) => [mapStatement(createdStatement), ...prev])
      setModalOpen(false)
      const currentDate = new Date()
      const month = String(currentDate.getMonth() + 1).padStart(2, '0')
      const year = currentDate.getFullYear()
      setForm({
        company_from: '',
        company_to: '',
        date: `${month}-${year}`,
        date_month: month,
        date_year: String(year),
        services: [],
        title: '',
        sub_total: '',
        vat: '',
        total: '',
        includeDrNo: true,
        includeRtNo: true,
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
      const headers = buildHeadersFromServices(
        editForm.services || [],
        services,
        editForm.existingHeaders ?? editForm.headers ?? null,
        {
          includeDrNo: editForm.includeDrNo,
          includeRtNo: editForm.includeRtNo,
        },
      )
      const payload = {
        company_from: Number(editForm.company_from),
        company_to: Number(editForm.company_to),
        date: editForm.date,
        title: editForm.title || buildGeneratedTitle(editForm.services || [], services),
        headers: JSON.stringify(headers),
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
      map[company.id] = company.name
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
      const matchesSearch =
        statement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(statement.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
        statement.prepared_by.toLowerCase().includes(searchQuery.toLowerCase()) ||
        statement.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(statement.company_from).toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(statement.company_to).toLowerCase().includes(searchQuery.toLowerCase())

      return matchesSearch
    })
  }, [statements, searchQuery])

  const metrics = useMemo(() => {
    const total = filteredStatements.length
    const totalValue = filteredStatements.reduce((acc, curr) => acc + curr.total, 0)
    return { total, totalValue }
  }, [filteredStatements])

  const isStatementDetailRoute =
    location.pathname !== '/statement' && location.pathname.startsWith('/statement/')

  if (isStatementDetailRoute) {
    return <Outlet />
  }

  const columns = [
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
      render: (row) => <div className="font-bold text-black">{row.title}</div>,
    },
    {
      header: 'Company From',
      key: 'company_from',
      render: (row) => (
        <div className="text-neutral-500">{companyMap[row.company_from] || row.company_from}</div>
      ),
    },
    {
      header: 'Company To',
      key: 'company_to',
      render: (row) => (
        <div className="text-neutral-500">{companyMap[row.company_to] || row.company_to}</div>
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
    {
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
    },
  ]

  return (
    <Layout
      activeItem="statement"
      title="Statement of Accounts"
      user={{ name: 'Administrator', role: 'Admin', initials: 'AD' }}
      onNavigate={handleNavigate}
      notificationCount={3}
    >
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
              Statement Month
            </label>
            <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
              <select
                required
                value={form.date_month}
                onChange={(e) => {
                  const month = e.target.value
                  const year = form.date_year || new Date().getFullYear()
                  setForm((prev) => ({
                    ...prev,
                    date_month: month,
                    date: `${month}-${year}`,
                    date_year: String(year),
                  }))
                }}
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Select month</option>
                {MONTH_OPTIONS.map((month, index) => {
                  const value = String(index + 1).padStart(2, '0')
                  return (
                    <option key={value} value={value}>
                      {month}
                    </option>
                  )
                })}
              </select>
              <input
                required
                type="number"
                min="2000"
                value={form.date_year}
                onChange={(e) => {
                  const year = e.target.value
                  const month =
                    form.date_month || String(new Date().getMonth() + 1).padStart(2, '0')
                  setForm((prev) => ({ ...prev, date_year: year, date: `${month}-${year}` }))
                }}
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
                placeholder="Year"
              />
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              {formatMonthLabel(form.date) || 'Choose a month and year for the statement.'}
            </p>
          </div>
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
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
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
                Statement Month
              </label>
              <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                <select
                  required
                  value={editForm.date_month}
                  onChange={(e) => {
                    const month = e.target.value
                    const year = editForm.date_year || new Date().getFullYear()
                    setEditForm((prev) => ({
                      ...prev,
                      date_month: month,
                      date: `${month}-${year}`,
                      date_year: String(year),
                    }))
                  }}
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="">Select month</option>
                  {MONTH_OPTIONS.map((month, index) => {
                    const value = String(index + 1).padStart(2, '0')
                    return (
                      <option key={value} value={value}>
                        {month}
                      </option>
                    )
                  })}
                </select>
                <input
                  required
                  type="number"
                  min="2000"
                  value={editForm.date_year}
                  onChange={(e) => {
                    const year = e.target.value
                    const month =
                      editForm.date_month || String(new Date().getMonth() + 1).padStart(2, '0')
                    setEditForm((prev) => ({ ...prev, date_year: year, date: `${month}-${year}` }))
                  }}
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Year"
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-500">
                {formatMonthLabel(editForm.date) || 'Choose a month and year for the statement.'}
              </p>
            </div>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded border border-gray-200 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.includeDrNo}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, includeDrNo: e.target.checked }))
                  }
                />
                <span className="text-sm text-gray-700">Include DR NO.</span>
              </label>
              <label className="flex items-center gap-3 rounded border border-gray-200 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.includeRtNo}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, includeRtNo: e.target.checked }))
                  }
                />
                <span className="text-sm text-gray-700">Include RT NO.</span>
              </label>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Title
              </label>
              <input
                required
                value={editForm.title || editGeneratedTitle}
                onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
                placeholder="Enter statement title"
              />
            </div>
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
    </Layout>
  )
}
