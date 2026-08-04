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

const mapAccess = (item) => ({
  id: item.access_id ?? item.id,
  name: item.name || item.access_name || 'Untitled access',
  description: item.description || 'System access role',
  status: formatStatus(item.status),
})

export default function Access() {
  const [access, setAccess] = useState([])
  const [routeAccess, setRouteAccess] = useState([])
  const [checkedRoutes, setCheckedRoutes] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [form, setForm] = useState({ access_name: '', description: '' })
  const [editForm, setEditForm] = useState(null)
  const [selectedAccessId, setSelectedAccessId] = useState(null)

  const handleNavigate = () => {}

  const showToast = (type, message) => setToast({ type, message })

  const loadAccess = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/access')
      setAccess((response.data?.data || []).map(mapAccess))
      setError('')
    } catch (err) {
      setError('Unable to load access records at the moment.')
    } finally {
      setLoading(false)
    }
  }

  const loadRouteAccess = async (accessId) => {
    try {
      const response = await apiClient.get(`/route-access/access/${accessId}`)
      const mappedData = (response.data?.data || []).map((item) => ({
        id: item.route_access_id,
        name: item.name,
        status: item.status,
      }))
      setRouteAccess(mappedData)
    } catch (err) {
      console.error('Error loading route access:', err)
      setRouteAccess([])
    }
  }

  useEffect(() => {
    loadAccess()
  }, [])

  const handleAddAccess = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        access_name: form.access_name,
        description: form.description,
        status: 'ACTIVE',
      }
      const response = await apiClient.post('/access', payload)
      const newAccess = response.data?.data || payload
      const accessId = newAccess.access_id || newAccess.id

      // Create default route access for the new access role
      const defaultRoutes = [
        'dashboard',
        'company',
        'department',
        'service',
        'store',
        'user',
        'access',
        'statement',
      ]

      await Promise.all(
        defaultRoutes.map((route) =>
          apiClient.post('/route-access', {
            access_id: accessId,
            name: route,
            status: 'Full Access',
          })
        )
      )

      showToast('success', response.data?.message || 'Access created successfully.')
      setAccess((prev) => [mapAccess(newAccess), ...prev])
      setModalOpen(false)
      setForm({ access_name: '', description: '' })
      setError('')
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Unable to create access record.')
      setError(err?.response?.data?.message || 'Unable to create access record.')
    }
  }

  const handleEditClick = (row) => {
    setEditForm({
      id: row.id,
      access_name: row.name || '',
      description: row.description || '',
      status: row.status?.toUpperCase() || 'ACTIVE',
    })
    setEditModalOpen(true)
  }

  const handleRowClick = (row) => {
    setSelectedAccessId(row.id)
    loadRouteAccess(row.id)
    setCheckedRoutes(new Set())
  }

  const handleCheckboxChange = (routeId) => {
    const newChecked = new Set(checkedRoutes)
    if (newChecked.has(routeId)) {
      newChecked.delete(routeId)
    } else {
      newChecked.add(routeId)
    }
    setCheckedRoutes(newChecked)
  }

  const handleBulkStatusChange = async (newStatus) => {
    if (!newStatus || checkedRoutes.size === 0) return

    try {
      const routeIds = Array.from(checkedRoutes)
      await Promise.all(
        routeIds.map((routeId) => apiClient.put(`/route-access/${routeId}`, { status: newStatus }))
      )
      setRouteAccess((prev) =>
        prev.map((route) => (checkedRoutes.has(route.id) ? { ...route, status: newStatus } : route))
      )
      setCheckedRoutes(new Set())
      showToast('success', `${routeIds.length} route(s) updated successfully`)
    } catch (err) {
      showToast('error', 'Failed to update route status')
    }
  }

  const handleUpdateAccess = async (e) => {
    e.preventDefault()
    if (!editForm || !editForm.id) return

    try {
      const payload = {
        access_name: editForm.access_name,
        description: editForm.description,
        status: editForm.status,
      }
      const response = await apiClient.put(`/access/${editForm.id}`, payload)
      showToast('success', response.data?.message || 'Access updated successfully.')
      const updated = mapAccess(
        response.data?.data || { access_id: editForm.id, ...payload },
      )
      setAccess((prev) => prev.map((acc) => (acc.id === editForm.id ? updated : acc)))
      setEditModalOpen(false)
      setEditForm(null)
      setError('')
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Unable to update access record.')
      setError(err?.response?.data?.message || 'Unable to update access record.')
    }
  }

  const filteredAccess = useMemo(() => {
    return access.filter((acc) => {
      const matchesSearch =
        acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(acc.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.description.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesFilter = statusFilter === 'All' || acc.status === statusFilter

      return matchesSearch && matchesFilter
    })
  }, [access, searchQuery, statusFilter])

  const metrics = useMemo(() => {
    const total = filteredAccess.length
    return { total }
  }, [filteredAccess])

  const columns = [
    {
      header: 'ID',
      key: 'id',
      render: (row) => (
        <div className="font-mono text-[11px] font-bold text-gray-400">{row.id}</div>
      ),
    },
    {
      header: 'Access Name',
      key: 'name',
      render: (row) => <div className="font-bold text-black">{row.name}</div>,
    },
    {
      header: 'Description',
      key: 'description',
      render: (row) => <div className="font-semibold text-gray-600">{row.description}</div>,
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

  const routeAccessColumns = [
    {
      header: '',
      key: 'checkbox',
      render: (row) => (
        <input
          type="checkbox"
          checked={checkedRoutes.has(row.id)}
          onChange={() => handleCheckboxChange(row.id)}
          className="h-4 w-4 rounded border-gray-300"
        />
      ),
    },
    {
      header: 'ID',
      key: 'id',
      render: (row) => (
        <div className="font-mono text-[11px] font-bold text-gray-400">{row.id}</div>
      ),
    },
    {
      header: 'Route Name',
      key: 'name',
      render: (row) => <div className="font-bold text-black">{row.name}</div>,
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => (
        <select
          value={row.status || 'Full Access'}
          onChange={(e) => handleRouteStatusChange(row.id, e.target.value)}
          className="rounded border border-gray-200 px-2 py-1 text-xs"
        >
          <option value="Full Access">Full Access</option>
          <option value="View Only">View Only</option>
          <option value="No Access">No Access</option>
        </select>
      ),
    },
  ]

  const handleRouteStatusChange = async (routeId, newStatus) => {
    try {
      await apiClient.put(`/route-access/${routeId}`, { status: newStatus })
      setRouteAccess((prev) =>
        prev.map((route) => (route.id === routeId ? { ...route, status: newStatus } : route))
      )
      showToast('success', 'Route status updated successfully')
    } catch (err) {
      showToast('error', 'Failed to update route status')
    }
  }

  return (
    <Layout
      activeItem="access"
      title="Access Control"
      user={{ name: 'Administrator', role: 'Admin', initials: 'AD' }}
      onNavigate={handleNavigate}
      notificationCount={3}
    >
      <div className="mx-auto flex flex-col h-auto overflow-visible lg:h-[calc(100vh-110px)] space-y-4 lg:overflow-hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:shrink-0">
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
              <span>Security</span>
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="text-red-600">Access Control</span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-black text-white ring-1 ring-neutral-900">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-black">
                  Access Control Management
                </h2>
                <p className="text-xs text-gray-500">
                  Define user roles, route permissions, and system-wide security protocols.
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
              Add Access Role
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 lg:shrink-0">
          <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Total Roles
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-black">{metrics.total}</span>
              <span className="text-[10px] font-medium text-gray-400">defined</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 flex-1 min-h-0">
          <div className="flex flex-col h-full min-h-0">
            <DynamicTable
              data={filteredAccess}
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              searchFields={['name', 'id', 'description']}
              columns={columns}
              registryLabel="System Roles"
              footerLabel="Security Protocol Verification Node Operational"
              footerMeta="Access Management System Integrated"
              onRowClick={handleRowClick}
              selectedRowId={selectedAccessId}
            />
          </div>
          <div className="flex flex-col h-full min-h-0">
            {checkedRoutes.size > 0 && (
              <div className="mb-2 flex items-center gap-2 rounded border border-gray-200 bg-white px-4 py-2 shadow-sm">
                <span className="text-xs font-medium text-gray-700">
                  {checkedRoutes.size} route(s) selected
                </span>
                <select
                  onChange={(e) => handleBulkStatusChange(e.target.value)}
                  className="rounded border border-gray-200 px-2 py-1 text-xs"
                >
                  <option value="">Change status to...</option>
                  <option value="Full Access">Full Access</option>
                  <option value="View Only">View Only</option>
                  <option value="No Access">No Access</option>
                </select>
              </div>
            )}
            <DynamicTable
              data={routeAccess}
              searchQuery=""
              statusFilter="All"
              searchFields={['name', 'id']}
              columns={routeAccessColumns}
              registryLabel="Route Privileges"
              footerLabel="Route Permission Management"
              footerMeta="Access Control System"
            />
          </div>
        </div>
      </div>
      <Modal open={editModalOpen} title="Edit Access Role" onClose={() => setEditModalOpen(false)}>
        {editForm ? (
          <form className="space-y-4" onSubmit={handleUpdateAccess}>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Access Name
              </label>
              <input
                required
                value={editForm.access_name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, access_name: e.target.value }))}
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
      <Modal open={modalOpen} title="Add Access Role" onClose={() => setModalOpen(false)}>
        <form className="space-y-4" onSubmit={handleAddAccess}>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Access Name
            </label>
            <input
              required
              value={form.access_name}
              onChange={(e) => setForm((prev) => ({ ...prev, access_name: e.target.value }))}
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
