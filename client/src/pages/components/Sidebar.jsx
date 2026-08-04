import React, { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  Settings,
  Layers,
  Building2,
  Users,
  Wrench,
  ShoppingBag,
  User,
  ChevronRight,
  Shield,
} from 'lucide-react'
import { getAccessibleRoutes } from '../../utils/routeProtection'
import logo from '../../../assets/logo.png'

const allMenuItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
]

const allMasterItems = [
  {
    id: 'company',
    label: 'Company',
    icon: Building2,
  },
  {
    id: 'department',
    label: 'Department',
    icon: Users,
  },
  {
    id: 'service',
    label: 'Service',
    icon: Wrench,
  },
  {
    id: 'store',
    label: 'Store',
    icon: ShoppingBag,
  },
  {
    id: 'user',
    label: 'User',
    icon: User,
  },
  {
    id: 'access',
    label: 'Access',
    icon: Shield,
  },
  {
    id: 'statement',
    label: 'Statement',
    icon: FileText,
  },
]

/**
 * Sidebar
 *
 * - `collapsed`   : desktop-only icon rail (still visible, just narrow — never fully hides)
 * - `mobileOpen`  : full-width drawer state used below the `lg` breakpoint
 * - `onNavigate`  : (id) => void
 * - `onMobileClose`: closes the mobile drawer (backdrop click / after navigating)
 */
export default function Sidebar({
  activeItem,
  collapsed = false,
  mobileOpen = false,
  onMobileClose,
  onNavigate,
}) {
  const [mastersOpen, setMastersOpen] = useState(true)

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user'))
    } catch {
      return null
    }
  }, [])

  const accessibleRoutes = useMemo(() => {
    if (!user) return []
    const routes = getAccessibleRoutes(user)
    console.log('Accessible routes for user:', user, '=>', routes)
    return routes
  }, [user])

  const menuItems = useMemo(() => {
    if (!user) return allMenuItems
    const filtered = allMenuItems.filter((item) => accessibleRoutes.includes(item.id))
    console.log('Menu items filtered:', filtered)
    return filtered
  }, [user, accessibleRoutes])

  const masterItems = useMemo(() => {
    if (!user) return allMasterItems
    const filtered = allMasterItems.filter((item) => accessibleRoutes.includes(item.id))
    console.log('Master items filtered:', filtered)
    return filtered
  }, [user, accessibleRoutes])

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onMobileClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-neutral-900 bg-[#0A0A0A] text-white transition-all duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Brand header */}
        <div
          className={`flex h-16 shrink-0 items-center justify-start gap-2 border-b border-neutral-900 px-3 ${collapsed ? 'lg:justify-center lg:px-0 lg:gap-0' : ''}`}
        >
          <img
            src={logo}
            alt="5L Solutions Supply & Allied Services"
            className={`h-12 w-auto object-contain transition-[opacity,width] duration-200 ${collapsed ? 'lg:h-8' : ''}`}
          />
          <span
            className={`text-sm font-black uppercase tracking-widest text-white transition-[opacity,width] duration-200 ${collapsed ? 'lg:hidden' : ''}`}
          >
             Billing System
          </span>

          <button
            onClick={onMobileClose}
            className="ml-auto rounded-md p-1 text-neutral-400 transition-colors hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {/* Dashboard (moved above Masters) */}
          {menuItems.map((item) => {
            const isActive = activeItem === item.id
            return (
              <Link
                key={item.id}
                to={`/${item.id}`}
                onClick={() => onNavigate?.(item.id)}
                title={collapsed ? item.label : undefined}
                className={`group relative flex w-full items-center gap-3.5 rounded-md px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200
                  ${collapsed ? 'lg:justify-center lg:px-0' : ''}
                  ${
                    isActive
                      ? 'bg-red-600/10 text-red-500'
                      : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
                  }`}
              >
                {/* active indicator bar */}
                <span
                  className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-red-600 transition-transform duration-200 ${
                    isActive ? 'scale-y-100' : 'scale-y-0'
                  }`}
                />
                <item.icon
                  className={`h-4 w-4 shrink-0 transition-colors duration-200 ${
                    isActive ? 'text-red-500' : 'text-neutral-500 group-hover:text-neutral-300'
                  }`}
                />
                <span
                  className={`whitespace-nowrap transition-[opacity,width] duration-200 ${collapsed ? 'lg:hidden' : ''}`}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}

          {/* Masters collapsible group */}
          <div className={`mb-2 ${collapsed ? 'lg:mb-4' : ''}`}>
            <button
              onClick={() => setMastersOpen((s) => !s)}
              aria-expanded={mastersOpen}
              className={`group flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 transition-colors duration-200 ${
                collapsed ? 'lg:justify-center lg:px-0' : ''
              }`}
              title={collapsed ? 'Masters' : undefined}
            >
              <span className="flex items-center gap-3">
                <Layers
                  className={`h-4 w-4 shrink-0 ${mastersOpen ? 'text-red-500' : 'text-neutral-500 group-hover:text-neutral-300'}`}
                />
                <span className={`${collapsed ? 'lg:hidden' : ''}`}>Masters</span>
              </span>

              <ChevronRight
                className={`h-4 w-4 shrink-0 transition-transform duration-200 ${mastersOpen ? 'rotate-90 text-red-500' : 'text-neutral-500 group-hover:text-neutral-300'} ${collapsed ? 'lg:hidden' : ''}`}
              />
            </button>

            <div className={`mt-2 space-y-1 ${mastersOpen ? 'block' : 'hidden'}`}>
              {masterItems
                .filter((m) => m.id !== 'statement')
                .map((m) => {
                  const isActive = activeItem === m.id
                  return (
                    <Link
                      key={m.id}
                      to={`/${m.id}`}
                      onClick={() => onNavigate?.(m.id)}
                      title={collapsed ? m.label : undefined}
                      className={`group relative flex w-full items-center gap-3.5 rounded-md px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                        collapsed ? 'lg:justify-center lg:px-0' : 'pl-10'
                      } ${
                        isActive
                          ? 'bg-red-600/10 text-red-500'
                          : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
                      }`}
                    >
                      <span
                        className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-red-600 transition-transform duration-200 ${
                          isActive ? 'scale-y-100' : 'scale-y-0'
                        }`}
                      />
                      <m.icon
                        className={`h-4 w-4 shrink-0 transition-colors duration-200 ${
                          isActive
                            ? 'text-red-500'
                            : 'text-neutral-500 group-hover:text-neutral-300'
                        }`}
                      />
                      <span
                        className={`whitespace-nowrap transition-[opacity,width] duration-200 ${collapsed ? 'lg:hidden' : ''}`}
                      >
                        {m.label}
                      </span>
                    </Link>
                  )
                })}
            </div>
          </div>

          <Link
            to="/statement"
            onClick={() => onNavigate?.('statement')}
            title={collapsed ? 'Statement' : undefined}
            className={`group relative flex w-full items-center gap-3.5 rounded-md px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
              collapsed ? 'lg:justify-center lg:px-0' : ''
            } ${
              activeItem === 'statement'
                ? 'bg-red-600/10 text-red-500'
                : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
            }`}
          >
            <span
              className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-red-600 transition-transform duration-200 ${
                activeItem === 'statement' ? 'scale-y-100' : 'scale-y-0'
              }`}
            />
            <FileText
              className={`h-4 w-4 shrink-0 transition-colors duration-200 ${
                activeItem === 'statement'
                  ? 'text-red-500'
                  : 'text-neutral-500 group-hover:text-neutral-300'
              }`}
            />
            <span
              className={`whitespace-nowrap transition-[opacity,width] duration-200 ${collapsed ? 'lg:hidden' : ''}`}
            >
              Statement
            </span>
          </Link>
        </nav>
      </aside>
    </>
  )
}
