import { createFileRoute, redirect } from '@tanstack/react-router'
import Dashboard from '../pages/dashboard/Dashboard'
import { hasRouteAccess, getAccessibleRoutes } from '../utils/routeProtection'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const user = JSON.parse(localStorage.getItem('user'))


    if (!user) {
      throw redirect({ to: '/' })
    }

    return
  },
  component: Dashboard,
})

export default Dashboard
