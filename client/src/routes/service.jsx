import { createFileRoute, redirect } from '@tanstack/react-router'
import Service from '../pages/service/Service'
import { hasRouteAccess, getAccessibleRoutes } from '../utils/routeProtection'

export const Route = createFileRoute('/service')({
  beforeLoad: async () => {
    const user = JSON.parse(localStorage.getItem('user'))

    if (!user) {
      throw redirect({ to: '/' })
    }

    if (!hasRouteAccess('service', user)) {
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
  component: Service,
})

export default Service
