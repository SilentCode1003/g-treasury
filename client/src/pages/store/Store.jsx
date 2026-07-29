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

const mapStore = (item) => ({
  id: item.store_id ?? item.id,
  number: item.number || item.regionalCode || '—',
  name: item.name || 'Untitled store',
  region: item.region || item.location || '—',
  city_province: item.city_province || '—',
  status: formatStatus(item.status),
  operationalCost: 0,
})

export default function Store() {
  const [stores, setStores] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [form, setForm] = useState({
    number: '',
    name: '',
    region: '',
    city_province: '',
  })
  const [editForm, setEditForm] = useState(null)

  const handleNavigate = () => {}

  const showToast = (type, message) => setToast({ type, message })

  const loadStores = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/store')
      setStores((response.data?.data || []).map(mapStore))
      setError('')
    } catch (err) {
      setError('Unable to load store records at the moment.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStores()
  }, [])

  const handleEditClick = (row) => {
    setEditForm({
      id: row.id,
      number: row.number,
      name: row.name,
      region: row.region,
      city_province: row.city_province,
      status: row.status.toUpperCase(),
    })
    setEditModalOpen(true)
  }

  const handleAddStore = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        number: form.number,
        name: form.name,
        region: form.region,
        city_province: form.city_province,
        status: 'ACTIVE',
      }
      const response = await apiClient.post('/store', payload)
      showToast('success', response.data?.message || 'Store created successfully.')
      setStores((prev) => [mapStore(response.data?.data || payload), ...prev])
      setModalOpen(false)
      setForm({ number: '', name: '', region: '', city_province: '' })
      setError('')
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Unable to create store record.')
      setError(err?.response?.data?.message || 'Unable to create store record.')
    }
  }

  const handleUpdateStore = async (e) => {
    e.preventDefault()
    if (!editForm?.id) return
    try {
      const payload = {
        number: editForm.number,
        name: editForm.name,
        region: editForm.region,
        city_province: editForm.city_province,
        status: editForm.status,
      }
      const response = await apiClient.put(`/store/${editForm.id}`, payload)
      showToast('success', response.data?.message || 'Store updated successfully.')
      const updated = mapStore(response.data?.data || { store_id: editForm.id, ...payload })
      setStores((prev) => prev.map((store) => (store.id === editForm.id ? updated : store)))
      setEditModalOpen(false)
      setEditForm(null)
      setError('')
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Unable to update store record.')
      setError(err?.response?.data?.message || 'Unable to update store record.')
    }
  }

  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      const matchesSearch =
        store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(store.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.city_province.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.status.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesFilter = statusFilter === 'All' || store.status === statusFilter

      return matchesSearch && matchesFilter
    })
  }, [stores, searchQuery, statusFilter])

  const metrics = useMemo(() => {
    const total = filteredStores.length
    const active = filteredStores.filter((s) => s.status === 'Active').length
    const totalCosts = filteredStores.reduce((acc, curr) => acc + curr.operationalCost, 0)
    return { total, active, totalCosts }
  }, [filteredStores])

  const columns = [
    {
      header: 'Store Number',
      key: 'number',
      render: (row) => (
        <div className="font-mono text-[11px] font-bold text-gray-700">{row.number}</div>
      ),
    },
    {
      header: 'Name',
      key: 'name',
      render: (row) => <div className="font-bold text-black">{row.name}</div>,
    },
    {
      header: 'Region',
      key: 'region',
      render: (row) => <div className="text-neutral-500">{row.region}</div>,
    },
    {
      header: 'City / Province',
      key: 'city_province',
      render: (row) => <div className="text-neutral-500">{row.city_province}</div>,
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
        return (
          <span className="rounded bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-700">
            {row.status}
          </span>
        )
      },
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => handleEditClick(row)}
            className="rounded border border-gray-200 bg-white p-2 text-blue-600 transition hover:bg-blue-50"
            title="Edit"
            aria-label="Edit store"
          >
            <Edit size={16} strokeWidth={1.5} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <Layout
      activeItem="store"
      title="Store Masters"
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
              <span className="text-red-600">Store</span>
            </div>

            {/* Page header */}
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-black text-white ring-1 ring-neutral-900">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-black">
                  Facility & Store Directories
                </h2>
                <p className="text-xs text-gray-500">
                  Manage commercial locations, active storage footprints, and distribution center
                  parameters.
                </p>
              </div>
            </div>
          </div>

          {/* Core Action: Add Store */}
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
              Add Store
            </button>
          </div>
        </div>

        {/* Analytic Highlight Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:shrink-0">
          <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Total Store Footprint
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-black">{metrics.total}</span>
              <span className="text-[10px] font-medium text-gray-400">mapped facilities</span>
            </div>
          </div>
          <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Operational Nodes
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-red-600">{metrics.active}</span>
              <span className="text-[10px] font-medium text-gray-400">active points</span>
            </div>
          </div>
          <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Cumulative Overheads
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-black">
                ${metrics.totalCosts.toLocaleString('en-US')}
              </span>
              <span className="text-[10px] font-bold text-emerald-600">Monthly Run-rate</span>
            </div>
          </div>
        </div>

        <DynamicTable
          data={filteredStores}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          searchFields={['number', 'name', 'region', 'city_province', 'status']}
          columns={columns}
          registryLabel="Physical Architecture Registry"
          footerLabel="Redline Ledger Location System Operational"
          footerMeta="Active Tracking Protocol Secure"
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
      <Modal open={modalOpen} title="Add Store" onClose={() => setModalOpen(false)}>
        <form className="space-y-4" onSubmit={handleAddStore}>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Store Number
            </label>
            <input
              required
              value={form.number}
              onChange={(e) => setForm((prev) => ({ ...prev, number: e.target.value }))}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
            />
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
              Region
            </label>
            <input
              value={form.region}
              onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value }))}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              City / Province
            </label>
            <input
              value={form.city_province}
              onChange={(e) => setForm((prev) => ({ ...prev, city_province: e.target.value }))}
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
      <Modal open={editModalOpen} title="Edit Store" onClose={() => setEditModalOpen(false)}>
        {editForm ? (
          <form className="space-y-4" onSubmit={handleUpdateStore}>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Store Number
              </label>
              <input
                required
                value={editForm.number}
                onChange={(e) => setEditForm((prev) => ({ ...prev, number: e.target.value }))}
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
              />
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
                Region
              </label>
              <input
                value={editForm.region}
                onChange={(e) => setEditForm((prev) => ({ ...prev, region: e.target.value }))}
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                City / Province
              </label>
              <input
                value={editForm.city_province}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, city_province: e.target.value }))
                }
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
