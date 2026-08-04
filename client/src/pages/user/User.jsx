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

const getStatusBadgeClasses = (status) => {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'INACTIVE') return 'bg-red-100 text-red-700'
  if (normalized === 'ACTIVE') return 'bg-emerald-100 text-emerald-700'
  return 'bg-gray-100 text-gray-700'
}

const getInitialForm = () => ({
  employee_id: '',
  fullname: '',
  username: '',
  password: '',
  access_id: '1',
  status: 'ACTIVE',
})

const mapUser = (item, accessList = []) => {
  const access = accessList.find(a => (a.access_id || a.id) === item.access_id)
  return {
    id: item.user_id ?? item.id,
    employeeId: item.employee_id || item.employeeId || '—',
    fullName: item.fullname || item.fullName || 'Unnamed user',
    username: item.username || '—',
    access_id: item.access_id != null ? Number(item.access_id) : 1,
    accessName: access?.name || access?.access_name || 'Unknown',
    status: formatStatus(item.status),
    rawStatus: String(item.status || 'ACTIVE').toUpperCase(),
  }
}

export default function User() {
  const [users, setUsers] = useState([])
  const [accessList, setAccessList] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState(getInitialForm())

  const handleNavigate = () => {}

  const showToast = (type, message) => setToast({ type, message })

  const resetModal = () => {
    setModalOpen(false)
    setEditingUser(null)
    setShowPassword(false)
    setForm(getInitialForm())
  }

  const openAddModal = () => {
    setEditingUser(null)
    setShowPassword(false)
    setForm(getInitialForm())
    setModalOpen(true)
  }

  const openEditModal = (user) => {
    setEditingUser(user)
    setShowPassword(false)
    setForm({
      employee_id: user.employeeId !== '—' ? user.employeeId : '',
      fullname: user.fullName !== 'Unnamed user' ? user.fullName : '',
      username: user.username !== '—' ? user.username : '',
      password: '',
      access_id: String(user.access_id ?? '1'),
      status: user.rawStatus || 'ACTIVE',
    })
    setModalOpen(true)
  }

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/user')
      setUsers((response.data?.data || []).map(item => mapUser(item, accessList)))
      setError('')
    } catch (err) {
      setError('Unable to load user records at the moment.')
    } finally {
      setLoading(false)
    }
  }

  const loadAccessList = async () => {
    try {
      const response = await apiClient.get('/access')
      setAccessList(response.data?.data || [])
    } catch (err) {
      console.error('Error loading access list:', err)
    }
  }

  useEffect(() => {
    loadUsers()
    loadAccessList()
  }, [])

  useEffect(() => {
    if (accessList.length > 0) {
      loadUsers()
    }
  }, [accessList])

  const handleSaveUser = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        employee_id: form.employee_id,
        fullname: form.fullname,
        username: form.username,
        password: form.password,
        access_id: Number(form.access_id),
        ...(editingUser ? { status: form.status } : { status: 'ACTIVE' }),
      }

      if (!editingUser && !form.password) {
        showToast('warning', 'Password is required to create a user.')
        setError('Password is required to create a user.')
        return
      }

      if (editingUser && !form.password) {
        delete payload.password
      }

      const response = editingUser
        ? await apiClient.put(`/user/${editingUser.id}`, payload)
        : await apiClient.post('/user', payload)

      showToast(
        'success',
        response.data?.message ||
          (editingUser ? 'User updated successfully.' : 'User created successfully.'),
      )

      if (editingUser) {
        await loadUsers()
      } else {
        const savedUser = mapUser({
          ...payload,
          user_id: response?.data?.data?.user_id ?? response?.data?.data?.id,
          id: response?.data?.data?.user_id ?? response?.data?.data?.id,
          status: 'ACTIVE',
        })

        setUsers((prev) => [savedUser, ...prev])
      }

      resetModal()
      setError('')
    } catch (err) {
      showToast(
        'error',
        err?.response?.data?.message ||
          (editingUser ? 'Unable to update user record.' : 'Unable to create user record.'),
      )
      setError(
        err?.response?.data?.message ||
          (editingUser ? 'Unable to update user record.' : 'Unable to create user record.'),
      )
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchText = [
        user.employeeId,
        user.fullName,
        user.username,
        user.accessLevel,
        user.status,
      ]
        .join(' ')
        .toLowerCase()

      const matchesSearch = searchText.includes(searchQuery.toLowerCase())
      const matchesFilter = statusFilter === 'All' || user.status === statusFilter

      return matchesSearch && matchesFilter
    })
  }, [users, searchQuery, statusFilter])

  const metrics = useMemo(() => {
    const total = filteredUsers.length
    const active = filteredUsers.filter((u) => u.status === 'Active').length
    const tierOneCount = filteredUsers.filter((u) => u.accessLevel === 'Tier 1').length
    return { total, active, tierOneCount }
  }, [filteredUsers])

  const columns = [
    {
      header: 'Employee ID',
      key: 'employeeId',
      render: (row) => (
        <div className="font-mono text-[11px] font-bold text-gray-500">{row.employeeId}</div>
      ),
    },
    {
      header: 'Full Name',
      key: 'fullName',
      render: (row) => <div className="font-bold text-black">{row.fullName}</div>,
    },
    {
      header: 'Username',
      key: 'username',
      render: (row) => <div className="text-gray-600">{row.username}</div>,
    },
    {
      header: 'Access',
      key: 'accessName',
      render: (row) => <div className="font-semibold text-gray-600">{row.accessName}</div>,
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => (
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${getStatusBadgeClasses(row.rawStatus)}`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => openEditModal(row)}
            className="rounded border border-gray-200 bg-white p-2 text-blue-600 transition hover:bg-blue-50"
            title="Edit"
            aria-label="Edit user"
          >
            <Edit size={16} strokeWidth={1.5} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <Layout
      activeItem="user"
      title="User Masters"
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
              <span className="text-red-600">User</span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-black text-white ring-1 ring-neutral-900">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-black">
                  User Accounts & Access Control
                </h2>
                <p className="text-xs text-gray-500">
                  Provision system profiles, adjust permission privileges, and audit active
                  operators.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={openAddModal}
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
              Add User
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:shrink-0">
          <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Total Provisioned Profiles
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-black">{metrics.total}</span>
              <span className="text-[10px] font-medium text-gray-400">active operators</span>
            </div>
          </div>
          <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Online Status Sessions
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-red-600">{metrics.active}</span>
              <span className="text-[10px] font-medium text-gray-400">nodes authenticated</span>
            </div>
          </div>
          <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Administrative Gateways
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-black">{metrics.tierOneCount}</span>
              <span className="text-[10px] font-bold text-emerald-600">Tier 1 Superusers</span>
            </div>
          </div>
        </div>

        <DynamicTable
          data={filteredUsers}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          searchFields={['employeeId', 'fullName', 'username', 'accessLevel', 'status']}
          columns={columns}
          registryLabel="Identity Master Registry"
          footerLabel="Redline Security Identity Gateway Aligned"
          footerMeta="Active Session Validation Encrypted"
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
      <Modal open={modalOpen} title={editingUser ? 'Edit User' : 'Add User'} onClose={resetModal}>
        <form className="space-y-4" onSubmit={handleSaveUser}>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Employee ID
            </label>
            <input
              required
              value={form.employee_id}
              onChange={(e) => setForm((prev) => ({ ...prev, employee_id: e.target.value }))}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Full Name
            </label>
            <input
              required
              value={form.fullname}
              onChange={(e) => setForm((prev) => ({ ...prev, fullname: e.target.value }))}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Username
            </label>
            <input
              required
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          {!editingUser ? (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Password
              </label>
              <div className="relative">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full rounded border border-gray-200 px-3 py-2 pr-20 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-red-600"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Access Level
            </label>
            <select
              required
              value={form.access_id}
              onChange={(e) => setForm((prev) => ({ ...prev, access_id: e.target.value }))}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
            >
              {accessList.map((access) => (
                <option key={access.access_id || access.id} value={access.access_id || access.id}>
                  {access.name || access.access_name}
                </option>
              ))}
            </select>
          </div>
          {editingUser ? (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={resetModal}
              className="rounded border border-gray-200 px-3 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-black px-3 py-2 text-sm font-semibold text-white"
            >
              {editingUser ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
