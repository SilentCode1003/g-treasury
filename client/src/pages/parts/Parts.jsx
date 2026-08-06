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

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const mapPart = (item) => ({
  id: item.part_id ?? item.id,
  name: item.name || 'Untitled part',
  description: item.description || '—',
  price: Number(item.price || 0),
  status: formatStatus(item.status),
})

export default function Parts() {
  const [parts, setParts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '' })
  const [editForm, setEditForm] = useState(null)

  const handleNavigate = () => {}

  const showToast = (type, message) => setToast({ type, message })

  const loadParts = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/parts')
      setParts((response.data?.data || []).map(mapPart))
      setError('')
    } catch (err) {
      setError('Unable to load part records at the moment.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadParts()
  }, [])

  const handleAddPart = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: form.price === '' ? null : Number(form.price),
        status: 'ACTIVE',
      }
      const response = await apiClient.post('/parts', payload)
      showToast('success', response.data?.message || 'Part created successfully.')
      setParts((prev) => [mapPart(response.data?.data || payload), ...prev])
      setModalOpen(false)
      setForm({ name: '', description: '', price: '' })
      setError('')
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Unable to create part record.')
      setError(err?.response?.data?.message || 'Unable to create part record.')
    }
  }

  const handleEditClick = (row) => {
    setEditForm({
      id: row.id,
      name: row.name || '',
      description: row.description || '',
      price: row.price || '',
      status: row.status?.toUpperCase() || 'ACTIVE',
    })
    setEditModalOpen(true)
  }

  const handleUpdatePart = async (e) => {
    e.preventDefault()
    if (!editForm || !editForm.id) return

    try {
      const payload = {
        name: editForm.name,
        description: editForm.description,
        price: editForm.price === '' ? null : Number(editForm.price),
        status: editForm.status,
      }
      const response = await apiClient.put(`/parts/${editForm.id}`, payload)
      showToast('success', response.data?.message || 'Part updated successfully.')
      const updated = mapPart(response.data?.data || { part_id: editForm.id, ...payload })
      setParts((prev) => prev.map((part) => (part.id === editForm.id ? updated : part)))
      setEditModalOpen(false)
      setEditForm(null)
      setError('')
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Unable to update part record.')
      setError(err?.response?.data?.message || 'Unable to update part record.')
    }
  }

  const filteredParts = useMemo(() => {
    return parts.filter((part) => {
      const matchesSearch =
        part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(part.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
        part.description.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesFilter = statusFilter === 'All' || part.status === statusFilter

      return matchesSearch && matchesFilter
    })
  }, [parts, searchQuery, statusFilter])

  const metrics = useMemo(() => {
    const total = filteredParts.length
    const totalValue = filteredParts.reduce((acc, curr) => acc + curr.price, 0)
    return { total, totalValue }
  }, [filteredParts])

  const columns = [
    {
      header: 'ID',
      key: 'id',
      render: (row) => (
        <div className="font-mono text-[11px] font-bold text-gray-400">{row.id}</div>
      ),
    },
    {
      header: 'Name',
      key: 'name',
      render: (row) => <div className="font-bold text-black">{row.name}</div>,
    },
    {
      header: 'Description',
      key: 'description',
      render: (row) => <div className="text-neutral-500">{row.description}</div>,
    },
    {
      header: 'Price',
      key: 'price',
      render: (row) => <div className="font-semibold text-gray-700">{formatCurrency(row.price)}</div>,
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
      activeItem="parts"
      title="Parts Masters"
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
              <span className="text-red-600">Parts</span>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-black text-white ring-1 ring-neutral-900">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-black">Parts Directories</h2>
                <p className="text-xs text-gray-500">
                  Manage parts inventory, pricing, and availability status.
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
              Add Part
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:shrink-0">
          <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Total Parts
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-black">{metrics.total}</span>
              <span className="text-[10px] font-medium text-gray-400">items</span>
            </div>
          </div>
          <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Total Value
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-red-600">{formatCurrency(metrics.totalValue)}</span>
              <span className="text-[10px] font-medium text-gray-400">inventory value</span>
            </div>
          </div>
        </div>

        <DynamicTable
          data={filteredParts}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          searchFields={['name', 'id', 'description']}
          columns={columns}
          registryLabel="Parts Registry"
          footerLabel="Redline Inventory System Operational"
          footerMeta="Active Parts Tracking"
        />
      </div>
      <Modal open={editModalOpen} title="Edit Part" onClose={() => setEditModalOpen(false)}>
        {editForm ? (
          <form className="space-y-4" onSubmit={handleUpdatePart}>
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
                Description
              </label>
              <input
                value={editForm.description}
                onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Price
              </label>
              <input
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
      <Modal open={modalOpen} title="Add Part" onClose={() => setModalOpen(false)}>
        <form className="space-y-4" onSubmit={handleAddPart}>
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
              Description
            </label>
            <input
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Price
            </label>
            <input
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
    </Layout>
  )
}
