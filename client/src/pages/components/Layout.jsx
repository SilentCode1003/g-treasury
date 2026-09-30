import React, { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { useSession } from '../../contexts/SessionContext'

/**
 * Layout
 *
 * Wrap any page with this component to get the sidebar + header shell.
 *
 *   <Layout activeItem="dashboard" title="Dashboard" user={user} onNavigate={goTo}>
 *     <YourPageContent />
 *   </Layout>
 */
export default function Layout({
  children,
  activeItem,
  title,
  user,
  onNavigate,
  onSearch,
  notificationCount = 0,
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { checkSessionExpiration } = useSession()

  const handleMenuClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setCollapsed((c) => !c)
    } else {
      setMobileOpen((o) => !o)
    }
  }

  const handleNavigate = (id) => {
    onNavigate?.(id)
    setMobileOpen(false)
  }

  // Check session expiration when Layout mounts
  useEffect(() => {
    checkSessionExpiration()
  }, [checkSessionExpiration])

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        activeItem={activeItem}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onNavigate={handleNavigate}
      />

      <div
        className={`flex min-h-screen flex-col transition-[padding] duration-300 ease-in-out ${
          collapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <Header
          title={title}
          onMenuClick={handleMenuClick}
          onSearch={onSearch}
          notificationCount={notificationCount}
          user={user}
        />

        <main className="flex-1 p-2 lg:p-4 bg-gray-200">{children}</main>
      </div>
    </div>
  )
}
