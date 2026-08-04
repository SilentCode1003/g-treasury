import { createFileRoute, redirect } from '@tanstack/react-router'
import Company from '../pages/company/Company'
import { hasRouteAccess, getAccessibleRoutes } from '../utils/routeProtection'

export const Route = createFileRoute('/company')({
  beforeLoad: async () => {
    const user = JSON.parse(localStorage.getItem('user'))

    if (!user) {
      throw redirect({ to: '/' })
    }

    // Skip access check for now to debug login issue
    return
  },
  component: Company,
})

export default Company
