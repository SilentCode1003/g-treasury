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

const formatPrice = (value) =>
  Number(value || 0).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const mapService = (item) => ({
  id: item.service_id ?? item.id,
  name: item.name || 'Untitled service',
  department_id: item.department_id ?? null,
  department_name:
    item.department_name ||
    item.department_description ||
    (item.department_id ? `Dept ${item.department_id}` : 'Unassigned'),
  price: Number(item.price) || 0,
  status: formatStatus(item.status),
})

export default function Service() {
  const [services, setServices] = useState([])
  const [departments, setDepartments] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [form, setForm] = useState({ department_id: '', name: '', price: '0' })
  const [editForm, setEditForm] = useState(null)

  const handleNavigate = () => {}

  const showToast = (type, message) => setToast({ type, message })

  const loadDepartments = async () => {
    try {
      const response = await apiClient.get('/department')
      const departmentList = (response.data?.data || []).map((item) => ({
        department_id: item.department_id,
        name: item.description || item.code || `Dept ${item.department_id}`,
      }))
      setDepartments(departmentList)
      if (!form.department_id && departmentList.length > 0) {
        setForm((prev) => ({ ...prev, department_id: String(departmentList[0].department_id) }))
      }
    } catch (err) {
      setError('Unable to load department options at the moment.')
    }
  }

  const loadServices = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/service')
      setServices((response.data?.data || []).map(mapService))
      setError('')
    } catch (err) {
      setError('Unable to load service records at the moment.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDepartments()
    loadServices()
  }, [])

  const handleEditClick = (row) => {
    setEditForm({
      id: row.id,
      department_id: String(row.department_id || ''),
      name: row.name || '',
      price: Number(row.price).toFixed(2),
      status: row.status?.toUpperCase() || 'ACTIVE',
    })
    setEditModalOpen(true)
  }

  const handleAddService = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        department_id: Number(form.department_id),
        name: form.name,
        price: Number(form.price),
        status: 'ACTIVE',
      }
      const response = await apiClient.post('/service', payload)
      showToast('success', response.data?.message || 'Service created successfully.')
      setServices((prev) => [mapService(response.data?.data || payload), ...prev])
      setModalOpen(false)
      setForm((prev) => ({
        ...prev,
        name: '',
        price: '0',
      }))
      setError('')
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Unable to create service record.')
      setError(err?.response?.data?.message || 'Unable to create service record.')
    }
  }

  const handleUpdateService = async (e) => {
    e.preventDefault()
    if (!editForm?.id) return
    try {
      const payload = {
        department_id: Number(editForm.department_id),
        name: editForm.name,
        price: Number(editForm.price),
        status: editForm.status,
      }
      const response = await apiClient.put(`/service/${editForm.id}`, payload)
      showToast('success', response.data?.message || 'Service updated successfully.')
      const updated = mapService(response.data?.data || { service_id: editForm.id, ...payload })
      setServices((prev) => prev.map((srv) => (srv.id === editForm.id ? updated : srv)))
      setEditModalOpen(false)
      setEditForm(null)
      setError('')
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Unable to update service record.')
      setError(err?.response?.data?.message || 'Unable to update service record.')
    }
  }

  const filteredServices = useMemo(() => {
    return services.filter((srv) => {
      const matchesSearch =
        srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(srv.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
        srv.department_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        srv.status.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesFilter = statusFilter === 'All' || srv.status === statusFilter

      return matchesSearch && matchesFilter
    })
  }, [services, searchQuery, statusFilter])

  const metrics = useMemo(() => {
    const total = filteredServices.length
    const active = filteredServices.filter((s) => s.status === 'Active').length
    const criticalTierCount = filteredServices.filter((s) => s.accuracyTier === 'Critical').length
    return { total, active, criticalTierCount }
  }, [filteredServices])

  const columns = [
    {
      header: 'ID',
      key: 'id',
      render: (row) => (
        <div className="font-mono text-[11px] font-bold text-gray-500">{row.id}</div>
      ),
    },
    {
      header: 'Service Name',
      key: 'name',
      render: (row) => <div className="font-bold text-black">{row.name}</div>,
    },
    {
      header: 'Department',
      key: 'department_name',
      render: (row) => <div className="text-neutral-500">{row.department_name}</div>,
    },
    {
      header: 'Price',
      key: 'price',
      align: 'right',
      render: (row) => <div className="font-bold text-black">{formatPrice(row.price)}</div>,
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => {
        const normalized = String(row.status || '')
          .trim()
          .toLowerCase()
        if (normalized === 'active') {
          return (
            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
              Active
            </span>
          )
        }
        if (normalized === 'inactive') {
          return (
            <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-[10px] font-semibold text-red-700">
              Inactive
            </span>
          )
        }
        return <span className="text-[10px] font-semibold text-gray-700">{row.status}</span>
      },
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center">
          <button
            onClick={() => handleEditClick(row)}
            aria-label="Edit"
            title="Edit"
            className="rounded bg-white/0 border border-gray-200 p-2 text-blue-600 hover:bg-blue-50"
          >
            <Edit size={16} strokeWidth={1.5} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <Layout
      activeItem="service"
      title="Service Masters"
      user={{ name: 'Administrator', role: 'Admin', initials: 'AD' }}
      onNavigate={handleNavigate}
      notificationCount={3}
    >
      {/* Container adapts to display height on desktop and natural scroll on mobile */}
      <div className="mx-auto flex flex-col h-auto overflow-visible lg:h-[calc(100vh-110px)] space-y-4 lg:overflow-hidden">
        {/* Top Control Block: Breadcrumbs & Add Button Action */}
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
              <span className="text-red-600">Service</span>
            </div>

            {/* Page header */}
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-black text-white ring-1 ring-neutral-900">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-black">
                  Operational Service Catalog
                </h2>
                <p className="text-xs text-gray-500">
                  Configure corporate capabilities, structured tariff sheets, and system processing
                  utilities.
                </p>
              </div>
            </div>
          </div>

          {/* Core Action: Add Service */}
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
              Add Service
            </button>
          </div>
        </div>

        {/* Analytic Highlight Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:shrink-0">
          <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Total Pipeline Capabilities
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-black">{metrics.total}</span>
              <span className="text-[10px] font-medium text-gray-400">defined products</span>
            </div>
          </div>
          <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Live Services Deployment
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-red-600">{metrics.active}</span>
              <span className="text-[10px] font-medium text-gray-400">online nodes</span>
            </div>
          </div>
          <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Critical Verification Tiers
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-black">{metrics.criticalTierCount}</span>
              <span className="text-[10px] font-bold text-emerald-600">
                high-security processes
              </span>
            </div>
          </div>
        </div>

        <DynamicTable
          data={filteredServices}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          searchFields={['name', 'id', 'department_name', 'status']}
          columns={columns}
          registryLabel="Active Offerings Catalog"
          footerLabel="Redline Ledger Engine Sync Node Active"
          footerMeta="Security Validation Protocol Initialized"
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
      <Modal open={modalOpen} title="Add Service" onClose={() => setModalOpen(false)}>
        <form className="space-y-4" onSubmit={handleAddService}>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Department
            </label>
            <select
              required
              value={form.department_id}
              onChange={(e) => setForm((prev) => ({ ...prev, department_id: e.target.value }))}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
            >
              {departments.map((dept) => (
                <option key={dept.department_id} value={String(dept.department_id)}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
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
              Price
            </label>
            <input
              required
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
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
      <Modal open={editModalOpen} title="Edit Service" onClose={() => setEditModalOpen(false)}>
        {editForm ? (
          <form className="space-y-4" onSubmit={handleUpdateService}>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Department
              </label>
              <select
                required
                value={editForm.department_id}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, department_id: e.target.value }))
                }
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
              >
                {departments.map((dept) => (
                  <option key={dept.department_id} value={String(dept.department_id)}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Name
              </label>
              <input
                required
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Price
              </label>
              <input
                required
                type="number"
                step="0.01"
                value={editForm.price}
                onChange={(e) => setEditForm((prev) => ({ ...prev, price: e.target.value }))}
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Status
              </label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
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
    </Layout>
  )
}
