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

    console.log('Checking dashboard access for user:', user)
    const hasAccess = hasRouteAccess('dashboard', user)
    console.log('Has dashboard access:', hasAccess)

    if (!hasAccess) {
      const accessibleRoutes = getAccessibleRoutes(user)
      console.log('Accessible routes:', accessibleRoutes)
      let redirectTo = '/dashboard'

      if (accessibleRoutes.length > 0) {
        if (accessibleRoutes.includes('dashboard')) {
          redirectTo = '/dashboard'
        } else {
          redirectTo = `/${accessibleRoutes[0]}`
        }
      }

      console.log('Redirecting to:', redirectTo)
      throw redirect({ to: redirectTo })
    }
  },
  component: Dashboard,
})

export default Dashboard
