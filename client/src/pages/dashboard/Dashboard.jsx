import React from 'react'
import Layout from '../components/Layout'

export default function Dashboard() {
  const handleNavigate = (id) => {
    // navigation (e.g. router) should be handled by the caller
    // This callback is forwarded to `Layout` which will also close mobile sidebar.
  }

  return (
    <Layout
      activeItem="dashboard"
      title="Dashboard"
      user={{ name: 'Administrator', role: 'Admin', initials: 'AD' }}
      onNavigate={handleNavigate}
      notificationCount={3}
    >
      <div className="max-w-6xl mx-auto bg-white shadow rounded-xl p-8">
        <p className="text-slate-600">You are now authenticated. Welcome to the dashboard.</p>
      </div>
    </Layout>
  )
}
