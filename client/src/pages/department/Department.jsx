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

const mapDepartment = (item) => ({
  id: item.department_id ?? item.id,
  name: item.description || 'Untitled department',
  code: item.code || '—',
  manager: 'API Managed',
  headcount: 0,
  status: formatStatus(item.status),
  budget: 0,
})

export default function Department() {
  const [departments, setDepartments] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [form, setForm] = useState({ code: '', description: '' })
  const [editForm, setEditForm] = useState(null)

  const handleNavigate = () => {}

  const showToast = (type, message) => setToast({ type, message })

  const loadDepartments = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/department')
      setDepartments((response.data?.data || []).map(mapDepartment))
      setError('')
    } catch (err) {
      setError('Unable to load department records at the moment.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDepartments()
  }, [])

  const handleAddDepartment = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        code: form.code,
        description: form.description,
        status: 'ACTIVE',
      }
      const response = await apiClient.post('/department', payload)
      showToast('success', response.data?.message || 'Department created successfully.')
      setDepartments((prev) => [mapDepartment(response.data?.data || payload), ...prev])
      setModalOpen(false)
      setForm({ code: '', description: '' })
      setError('')
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Unable to create department record.')
      setError(err?.response?.data?.message || 'Unable to create department record.')
    }
  }

  const handleEditClick = (row) => {
    setEditForm({
      id: row.id,
      code: row.code || '',
      description: row.name || '',
      status: row.status?.toUpperCase() || 'ACTIVE',
    })
    setEditModalOpen(true)
  }

  const handleUpdateDepartment = async (e) => {
    e.preventDefault()
    if (!editForm || !editForm.id) return

    try {
      const payload = {
        code: editForm.code,
        description: editForm.description,
        status: editForm.status,
      }
      const response = await apiClient.put(`/department/${editForm.id}`, payload)
      showToast('success', response.data?.message || 'Department updated successfully.')
      const updated = mapDepartment(
        response.data?.data || { department_id: editForm.id, ...payload },
      )
      setDepartments((prev) => prev.map((dept) => (dept.id === editForm.id ? updated : dept)))
      setEditModalOpen(false)
      setEditForm(null)
      setError('')
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Unable to update department record.')
      setError(err?.response?.data?.message || 'Unable to update department record.')
    }
  }

  const filteredDepartments = useMemo(() => {
    return departments.filter((dept) => {
      const matchesSearch =
        dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(dept.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
        dept.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dept.manager.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesFilter = statusFilter === 'All' || dept.status === statusFilter

      return matchesSearch && matchesFilter
    })
  }, [departments, searchQuery, statusFilter])

  const metrics = useMemo(() => {
    const total = filteredDepartments.length
    const totalHeadcount = filteredDepartments.reduce((acc, curr) => acc + curr.headcount, 0)
    const totalBudget = filteredDepartments.reduce((acc, curr) => acc + curr.budget, 0)
    return { total, totalHeadcount, totalBudget }
  }, [filteredDepartments])

  const columns = [
    {
      header: 'ID',
      key: 'id',
      render: (row) => (
        <div className="font-mono text-[11px] font-bold text-gray-400">{row.id}</div>
      ),
    },
    {
      header: 'Code',
      key: 'code',
      render: (row) => (
        <div className="text-[11px] font-semibold uppercase tracking-wider text-red-600">
          {row.code}
        </div>
      ),
    },
    {
      header: 'Department Unit',
      key: 'name',
      render: (row) => <div className="font-bold text-black">{row.name}</div>,
    },
    {
      header: 'Direct Supervisor',
      key: 'manager',
      render: (row) => <div className="font-semibold text-gray-600">{row.manager}</div>,
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
      activeItem="department"
      title="Department Masters"
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
              <span className="text-red-600">Department</span>
            </div>

            {/* Page header */}
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-black text-white ring-1 ring-neutral-900">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-black">
                  Department Directories
                </h2>
                <p className="text-xs text-gray-500">
                  Manage organizational units, segment access nodes, and internal group structures.
                </p>
              </div>
            </div>
          </div>

          {/* Core Action: Add Department */}
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
              Add Department
            </button>
          </div>
        </div>

        {/* Analytic Highlight Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:shrink-0">
          <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Total Segments
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-black">{metrics.total}</span>
              <span className="text-[10px] font-medium text-gray-400">active units</span>
            </div>
          </div>
          <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Total Workforce Pool
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-red-600">{metrics.totalHeadcount}</span>
              <span className="text-[10px] font-medium text-gray-400">assigned personnel</span>
            </div>
          </div>
          <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Cumulative Allocated Budget
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-black">
                ${metrics.totalBudget.toLocaleString('en-US')}
              </span>
              <span className="text-[10px] font-bold text-emerald-600">Q3 Dynamic Allocation</span>
            </div>
          </div>
        </div>

        <DynamicTable
          data={filteredDepartments}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          searchFields={['name', 'id', 'code', 'manager']}
          columns={columns}
          registryLabel="Organizational Registry"
          footerLabel="Redline Identity Verification Node Operational"
          footerMeta="Registry System Integrated"
        />
      </div>
      <Modal open={editModalOpen} title="Edit Department" onClose={() => setEditModalOpen(false)}>
        {editForm ? (
          <form className="space-y-4" onSubmit={handleUpdateDepartment}>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Code
              </label>
              <input
                required
                value={editForm.code}
                onChange={(e) => setEditForm((prev) => ({ ...prev, code: e.target.value }))}
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
      <Modal open={modalOpen} title="Add Department" onClose={() => setModalOpen(false)}>
        <form className="space-y-4" onSubmit={handleAddDepartment}>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Code
            </label>
            <input
              required
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
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
