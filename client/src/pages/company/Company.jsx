import React, { useEffect, useMemo, useState } from 'react'
import { Edit } from 'lucide-react'
import Layout from '../components/Layout'
import DynamicTable from '../components/DynamicTable'
import Modal from '../components/Modal'
import DynamicToast from '../components/DynamicToast'
import { apiClient } from '../../api/axios'

const formatStatus = (value) => {
  const normalized = String(value || '').toUpperCase()
  if (normalized === 'INACTIVE') return 'Inactive'
  if (normalized === 'ACTIVE') return 'Active'
  return 'Active'
}

const sanitizeNumeric = (value, max = 15) => {
  if (!value) return ''
  const digits = String(value).replace(/\D+/g, '')
  return digits.slice(0, max)
}

const formatTin = (tin) => {
  if (!tin) return ''
  const digits = String(tin).replace(/\D+/g, '')
  // Philippine TIN: 9-digit individual => XXX-XXX-XXX, 12-digit => XXX-XXX-XXX-XXX
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  // digits.length > 9 (up to 12)
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}-${digits.slice(9)}`
}

const mapCompany = (item) => ({
  id: item.mc_id ?? item.company_id ?? item.id,
  name: item.mc_name ?? item.name ?? 'Untitled company',
  regNo: item.mc_tin ?? item.tin ?? item.regNo ?? '—',
  email: item.mc_email ?? item.email ?? '—',
  address: item.mc_address ?? item.address ?? '—',
  mobile_number: item.mc_mobile_number ?? item.mobile_number ?? '—',
  telephone_number: item.mc_telephone_number ?? item.telephone_number ?? '—',
  details: item.mc_details ?? item.details ?? '—',
  type: item.mc_type ?? item.type ?? 'CUSTOMER',
})

export default function Company() {
  const [companies, setCompanies] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    address: '',
    mobile_number: '',
    telephone_number: '',
    tin: '',
    details: '',
    type: 'CUSTOMER',
  })
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState(null)

  const handleNavigate = () => {}

  const showToast = (type, message) => setToast({ type, message })

  const loadCompanies = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/company')
      setCompanies((response.data?.data || []).map(mapCompany))
      setError('')
    } catch (err) {
      setError('Unable to load company records at the moment.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCompanies()
  }, [])

  const handleAddCompany = async (e) => {
    e.preventDefault()
    try {
      // client-side validation: numeric fields and max lengths
      const mobile = sanitizeNumeric(form.mobile_number, 15)
      const telephone = sanitizeNumeric(form.telephone_number, 15)
      const tinVal = sanitizeNumeric(form.tin, 12)

      if (mobile && mobile.length > 15) {
        setError('Mobile number must be at most 15 digits.')
        return
      }
      if (telephone && telephone.length > 15) {
        setError('Telephone number must be at most 15 digits.')
        return
      }
      if (tinVal && tinVal.length !== 9 && tinVal.length !== 12) {
        setError('TIN must be either 9 digits (XXX-XXX-XXX) or 12 digits (XXX-XXX-XXX-XXX).')
        return
      }
      const payload = {
        name: form.name,
        address: form.address || null,
        email: form.email || null,
        mobile_number: mobile || null,
        telephone_number: telephone || null,
        tin: tinVal || null, // store numeric-only TIN
        details: form.details || null,
        type: form.type,
      }
      const response = await apiClient.post('/company', payload)
      showToast('success', response.data?.message || 'Company created successfully.')
      setCompanies((prev) => [mapCompany(response.data?.data || payload), ...prev])
      setForm({
        name: '',
        email: '',
        address: '',
        mobile_number: '',
        telephone_number: '',
        tin: '',
        details: '',
        type: 'CUSTOMER',
      })
      setModalOpen(false)
      setError('')
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Unable to create company record.')
      setError(err?.response?.data?.message || 'Unable to create company record.')
    }
  }

  const handleEditClick = (row) => {
    setEditForm({
      id: row.id,
      name: row.name || '',
      email: row.email || '',
      address: row.address || '',
      mobile_number: row.mobile_number || '',
      telephone_number: row.telephone_number || '',
      tin: row.regNo || '',
      details: row.details || '',
      type: row.type || 'CUSTOMER',
    })
    setEditModalOpen(true)
  }

  const handleUpdateCompany = async (e) => {
    e.preventDefault()
    if (!editForm || !editForm.id) return
    try {
      const mobile = sanitizeNumeric(editForm.mobile_number, 15)
      const telephone = sanitizeNumeric(editForm.telephone_number, 15)
      const tinVal = sanitizeNumeric(editForm.tin, 12)

      if (mobile && mobile.length > 15) {
        setError('Mobile number must be at most 15 digits.')
        return
      }
      if (telephone && telephone.length > 15) {
        setError('Telephone number must be at most 15 digits.')
        return
      }
      if (tinVal && tinVal.length !== 9 && tinVal.length !== 12) {
        setError('TIN must be either 9 digits (XXX-XXX-XXX) or 12 digits (XXX-XXX-XXX-XXX).')
        return
      }

      const payload = {
        name: editForm.name,
        address: editForm.address || null,
        email: editForm.email || null,
        mobile_number: mobile || null,
        telephone_number: telephone || null,
        tin: tinVal || null,
        details: editForm.details || null,
        type: editForm.type,
      }

      const response = await apiClient.put(`/company/${editForm.id}`, payload)
      showToast('success', response.data?.message || 'Company updated successfully.')
      const updated = mapCompany(response.data?.data || { ...payload, company_id: editForm.id })
      setCompanies((prev) => prev.map((c) => (c.id === editForm.id ? updated : c)))
      setEditModalOpen(false)
      setEditForm(null)
      setError('')
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Unable to update company record.')
      setError(err?.response?.data?.message || 'Unable to update company record.')
    }
  }

  const filteredCompanies = useMemo(() => {
    const q = (searchQuery || '').toLowerCase()
    return companies.filter((company) => {
      const matchesSearch =
        (company.name || '').toLowerCase().includes(q) ||
        String(company.id || '')
          .toLowerCase()
          .includes(q) ||
        (company.regNo || '').toLowerCase().includes(q) ||
        (company.email || '').toLowerCase().includes(q) ||
        (company.mobile_number || '').toLowerCase().includes(q)

      return matchesSearch
    })
  }, [companies, searchQuery])

  const metrics = useMemo(() => {
    const total = filteredCompanies.length
    const customers = filteredCompanies.filter(
      (c) => (c.type || '').toUpperCase() === 'CUSTOMER',
    ).length
    const totalRev = 0
    return { total, customers, totalRev }
  }, [filteredCompanies])

  const columns = [
    {
      header: 'ID',
      key: 'id',
      render: (row) => (
        <div className="font-mono text-[11px]">
          <span className="block font-bold text-gray-400">{row.id}</span>
        </div>
      ),
    },
    {
      header: 'Reference',
      key: 'regNo',
      render: (row) => (
        <div className="font-mono text-[11px]">
          <span className="rounded bg-red-50/50 px-1 text-[10px] font-bold uppercase text-red-600">
            {formatTin(row.regNo)}
          </span>
        </div>
      ),
    },
    {
      header: 'Company',
      key: 'name',
      render: (row) => (
        <div>
          <div className="font-bold text-black">{row.name}</div>
          <div className="text-[11px] font-normal text-gray-400">{row.type}</div>
        </div>
      ),
    },
    {
      header: 'Contact',
      key: 'contact',
      render: (row) => (
        <div>
          <div className="text-[11px] font-semibold text-gray-700">{row.email}</div>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-gray-500">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M22 16.92V21a1 1 0 0 1-1.11 1 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2 3.11 1 1 0 0 1 3 2h4.09a1 1 0 0 1 1 .75c.12.61.33 1.2.61 1.77a1 1 0 0 1-.24 1L7.2 7.8a16 16 0 0 0 6 6l1.29-1.26a1 1 0 0 1 1-.24c.57.28 1.16.49 1.77.61a1 1 0 0 1 .75 1V21z"
                />
              </svg>
              <span>{row.mobile_number || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 7l-6 6M9 7h6v6"
                />
              </svg>
              <span>{row.telephone_number || '—'}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Address',
      key: 'address',
      render: (row) => <div className="text-[11px] text-gray-600">{row.address}</div>,
    },
    {
      header: 'TIN',
      key: 'regNo',
      render: (row) => <div className="font-mono text-[11px]">{formatTin(row.regNo)}</div>,
    },
    {
      header: 'Details',
      key: 'details',
      render: (row) => (
        <div className="text-[11px] text-gray-500">
          {row.details ? row.details.slice(0, 80) + (row.details.length > 80 ? '…' : '') : '—'}
        </div>
      ),
    },
    {
      header: 'Type',
      key: 'type',
      render: (row) => <div className="text-[11px] font-semibold">{row.type}</div>,
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'center',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEditClick(row)}
            aria-label="Edit"
            title="Edit"
            className="rounded bg-white/0 border border-gray-200 p-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
          >
            <Edit size={16} strokeWidth={1.5} className="text-blue-600" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <Layout
      activeItem="company"
      title="Company Masters"
      user={{ name: 'Administrator', role: 'Admin', initials: 'AD' }}
      onNavigate={handleNavigate}
      notificationCount={3}
    >
      {/* Changes:
        - Mobile: 'h-auto overflow-visible' lets everything grow naturally to scroll the page.
        - Desktop (lg): 'lg:h-[calc(100vh-110px)] lg:overflow-hidden' freezes layout within the screen frame.
      */}
      <div className="mx-auto flex flex-col h-auto overflow-visible lg:h-[calc(100vh-110px)] space-y-4 lg:overflow-hidden">
        {/* Top Control Block */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:shrink-0">
          <div>
            {/* Breadcrumb */}
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
              <span className="text-red-600">Company</span>
            </div>

            {/* Page header */}
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-black text-white ring-1 ring-neutral-900">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 21h18M5 21V7a2 2 0 012-2h3v16M19 21V11a2 2 0 00-2-2h-4v12M9 9h1m-1 4h1m-1 4h1m5-6h1m-1 4h1"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-black">
                  Company Profiles & Ledger
                </h2>
                <p className="text-xs text-gray-500">
                  Manage internal entities and monitored client corporate structures.
                </p>
              </div>
            </div>
          </div>

          {/* Add Company Button */}
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
              Add Company
            </button>
          </div>
        </div>

        {/* Analytic Highlight Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:shrink-0">
          <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Total Entities
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-black">{metrics.total}</span>
              <span className="text-[10px] font-medium text-gray-400">tracked records</span>
            </div>
          </div>
          <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Active Operational Status
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-red-600">{metrics.customers}</span>
              <span className="text-[10px] font-medium text-gray-400">customers</span>
            </div>
          </div>
          <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Aggregate Revenue Combined
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-black">
                ${metrics.totalRev.toLocaleString('en-US')}
              </span>
              <span className="text-[10px] font-bold text-emerald-600">+27% dynamic</span>
            </div>
          </div>
        </div>

        <DynamicTable
          data={filteredCompanies}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          searchFields={[
            'name',
            'id',
            'regNo',
            'email',
            'mobile_number',
            'telephone_number',
            'tin',
          ]}
          columns={columns}
          registryLabel="Associated Corporate Registry"
          footerLabel="Redline Verification Engine Secured"
          footerMeta="256-bit encrypted core ledger alignment"
        />
        {/* Edit Modal */}
        <Modal open={editModalOpen} title="Edit Company" onClose={() => setEditModalOpen(false)}>
          {editForm ? (
            <form className="space-y-4" onSubmit={handleUpdateCompany}>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Name
                </label>
                <input
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Email
                </label>
                <input
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Address
                </label>
                <textarea
                  value={editForm.address}
                  onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Mobile Number
                  </label>
                  <input
                    value={editForm.mobile_number}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        mobile_number: sanitizeNumeric(e.target.value, 15),
                      }))
                    }
                    className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={15}
                    placeholder="Digits only"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Telephone Number
                  </label>
                  <input
                    value={editForm.telephone_number}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        telephone_number: sanitizeNumeric(e.target.value, 15),
                      }))
                    }
                    className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={15}
                    placeholder="Digits only"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  TIN
                </label>
                <input
                  value={formatTin(editForm.tin)}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, tin: sanitizeNumeric(e.target.value, 12) }))
                  }
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
                  inputMode="numeric"
                  maxLength={15}
                  placeholder="Digits only, 9 or 12"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Details
                </label>
                <textarea
                  value={editForm.details}
                  onChange={(e) => setEditForm((p) => ({ ...p, details: e.target.value }))}
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Type
                </label>
                <select
                  value={editForm.type}
                  onChange={(e) => setEditForm((p) => ({ ...p, type: e.target.value }))}
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="CUSTOMER">Customer</option>
                  <option value="VENDOR">Vendor</option>
                  <option value="INTERNAL">Internal</option>
                </select>
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
      <Modal open={modalOpen} title="Add Company" onClose={() => setModalOpen(false)}>
        <form className="space-y-4" onSubmit={handleAddCompany}>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Name
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Email
            </label>
            <input
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Address
            </label>
            <textarea
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Mobile Number
              </label>
              <input
                value={form.mobile_number}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    mobile_number: sanitizeNumeric(e.target.value, 15),
                  }))
                }
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={15}
                placeholder="Digits only"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Telephone Number
              </label>
              <input
                value={form.telephone_number}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    telephone_number: sanitizeNumeric(e.target.value, 15),
                  }))
                }
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={15}
                placeholder="Digits only"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              TIN
            </label>
            <input
              value={formatTin(form.tin)}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, tin: sanitizeNumeric(e.target.value, 12) }))
              }
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
              inputMode="numeric"
              maxLength={15}
              placeholder="Digits only, 9 or 12"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Details
            </label>
            <textarea
              value={form.details}
              onChange={(e) => setForm((prev) => ({ ...prev, details: e.target.value }))}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
              rows={3}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Type
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="CUSTOMER">Customer</option>
              <option value="VENDOR">Vendor</option>
              <option value="INTERNAL">Internal</option>
            </select>
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
    </Layout>
  )
}
