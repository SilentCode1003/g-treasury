import { createFileRoute, redirect } from '@tanstack/react-router'
import Company from '../pages/company/Company'
import { hasRouteAccess, getAccessibleRoutes } from '../utils/routeProtection'

export const Route = createFileRoute('/company')({
  beforeLoad: async () => {
    const user = JSON.parse(localStorage.getItem('user'))

    if (!user) {
      throw redirect({ to: '/' })
    }

    if (!hasRouteAccess('company', user)) {
      const accessibleRoutes = getAccessibleRoutes(user)
      let redirectTo = '/dashboard'

      if (accessibleRoutes.length > 0) {
        if (accessibleRoutes.includes('dashboard')) {
          redirectTo = '/dashboard'
        } else {
          redirectTo = `/${accessibleRoutes[0]}`
        }
      }

      throw redirect({ to: redirectTo })
    }
  },
  component: Company,
})

export default Company
