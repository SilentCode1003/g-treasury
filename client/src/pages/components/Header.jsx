import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { apiClient } from '../../api/axios'

export default function Header({
  title,
  onMenuClick,
  onSearch,
  notificationCount = 0,
  user,
  onLogout,
}) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setProfileOpen(false)
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setProfileOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const handleLogout = async () => {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    setProfileOpen(false)

    try {
      await apiClient.post('/credentials/logout')
      if (typeof window !== 'undefined') {
        window.sessionStorage.clear()
        window.localStorage.clear()
      }
      await navigate({ to: '/login' })
    } catch (error) {
      if (typeof window !== 'undefined') {
        window.sessionStorage.clear()
        window.localStorage.clear()
      }
      await navigate({ to: '/login' })
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-gray-100 bg-white px-4 lg:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <h1 className="text-lg font-bold uppercase tracking-wider text-black">{title}</h1>
      </div>

      <div className="flex items-center gap-3 lg:gap-5">
        {/* Search */}
        <div className="relative hidden sm:block">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search ledger..."
            onChange={onSearch}
            className="w-48 rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-xs transition-colors duration-150 focus:border-black focus:bg-white focus:outline-none"
          />
        </div>

        {/* Notifications */}
        <button className="relative rounded-md p-2 text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-black">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {notificationCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
            </span>
          )}
        </button>

        {/* Profile */}
        <div ref={menuRef} className="relative border-l border-gray-200 pl-3 lg:pl-5">
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-md py-1 pl-1 pr-2 transition-colors duration-150 hover:bg-gray-50"
            aria-haspopup="true"
            aria-expanded={profileOpen}
          >
            <div className="hidden text-right md:block">
              <p className="text-xs font-semibold text-black">{user?.name || 'User'}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                {user?.role || 'Staff'}
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white ring-2 ring-red-600 ring-offset-2">
              {user?.initials || 'U'}
            </div>
            <svg
              className={`hidden h-3.5 w-3.5 text-gray-400 transition-transform duration-200 md:block ${profileOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Dropdown */}
          <div
            className={`absolute right-0 z-40 mt-2 w-52 origin-top-right rounded-md border border-gray-100 bg-white py-1.5 shadow-lg transition-all duration-150 ${
              profileOpen
                ? 'translate-y-0 scale-100 opacity-100'
                : 'pointer-events-none -translate-y-1 scale-95 opacity-0'
            }`}
          >
            <div className="border-b border-gray-100 px-3.5 py-2.5">
              <p className="text-xs font-semibold text-black">{user?.name || 'User'}</p>
              <p className="truncate text-[10px] text-gray-400">
                {user?.email || 'user@redline.com'}
              </p>
            </div>

            <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-600 transition-colors duration-150 hover:bg-gray-50 hover:text-black">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Profile
            </button>

            <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-600 transition-colors duration-150 hover:bg-gray-50 hover:text-black">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
              </svg>
              Settings
            </button>

            <div className="my-1 border-t border-gray-100" />

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-600 transition-colors duration-150 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
