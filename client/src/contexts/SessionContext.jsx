import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { apiClient } from '../api/axios'

const SessionContext = createContext(null)

const SESSION_EXPIRES_AT_KEY = 'sessionExpiresAt'
const CHECK_INTERVAL = 60000 // Check every minute

export const SessionProvider = ({ children }) => {
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(false)
  const [logoutInProgress, setLogoutInProgress] = useState(false)

  const performLogout = useCallback(async () => {
    if (logoutInProgress) return

    const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
    const isOnLoginPage = pathname === '/login' || pathname === '/'

    setLogoutInProgress(true)

    // Only call API if not already on login page
    if (!isOnLoginPage) {
      try {
        await apiClient.post('/logout')
      } catch (error) {
        console.error('Logout API call failed:', error)
      }
    }

    // Clear local storage regardless of API call success
    if (typeof window !== 'undefined') {
      window.sessionStorage.clear()
      window.localStorage.clear()
    }

    // Navigate to login only if not already there
    if (!isOnLoginPage) {
      await navigate({ to: '/login' })
    }

    setLogoutInProgress(false)
  }, [logoutInProgress, navigate])

  const checkSessionExpiration = useCallback(() => {
    if (isChecking || logoutInProgress) return

    setIsChecking(true)

    try {
      const expiresAt = localStorage.getItem(SESSION_EXPIRES_AT_KEY)
      const user = localStorage.getItem('user')

      if (!expiresAt) {
        // No session expiration time stored - check if user is logged in
        if (user) {
          // User is logged in but no expiration time - logout
          performLogout()
        }
        return
      }

      const expirationTime = parseInt(expiresAt, 10)
      const currentTime = Date.now()
      const timeUntilExpiry = expirationTime - currentTime

      // If session has expired or will expire in less than 5 minutes, logout
      if (timeUntilExpiry <= 0) {
        console.log('Session expired, logging out...')
        performLogout()
      } else if (timeUntilExpiry < 300000) {
        // Warning: session about to expire in less than 5 minutes
        console.warn(`Session will expire in ${Math.ceil(timeUntilExpiry / 1000)} seconds`)
      }
    } catch (error) {
      console.error('Error checking session expiration:', error)
      // On error, only logout if user is logged in
      const user = localStorage.getItem('user')
      if (user) {
        performLogout()
      }
    } finally {
      setIsChecking(false)
    }
  }, [isChecking, logoutInProgress, performLogout])

  const setSessionExpiration = useCallback((expiresAt) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_EXPIRES_AT_KEY, expiresAt.toString())
    }
  }, [])

  const clearSessionExpiration = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_EXPIRES_AT_KEY)
    }
  }, [])

  useEffect(() => {
    console.log('Setting up session check interval:', CHECK_INTERVAL, 'ms')
    // Start periodic session checking
    const intervalId = setInterval(() => {
      console.log('Running periodic session check...')
      checkSessionExpiration()
    }, CHECK_INTERVAL)

    // Check immediately on mount
    console.log('Running initial session check...')
    checkSessionExpiration()

    return () => {
      console.log('Clearing session check interval')
      clearInterval(intervalId)
    }
  }, [checkSessionExpiration])

  // Also check when window becomes visible (tab switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkSessionExpiration()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkSessionExpiration])

  const value = {
    checkSessionExpiration,
    setSessionExpiration,
    clearSessionExpiration,
    performLogout,
    isChecking,
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export const useSession = () => {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}
