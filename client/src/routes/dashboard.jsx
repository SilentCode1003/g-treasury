import { createFileRoute, redirect } from '@tanstack/react-router'
import Dashboard from '../pages/dashboard/Dashboard'
import { hasRouteAccess, getAccessibleRoutes } from '../utils/routeProtection'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const user = JSON.parse(localStorage.getItem('user'))

    console.log('Dashboard beforeLoad - user:', user)

    if (!user) {
      console.log('No user found, redirecting to login')
      throw redirect({ to: '/' })
    }

    // Skip access check for now to debug login issue
    console.log('Skipping access check for debugging')
    return
  },
  component: Dashboard,
})

export default Dashboard
