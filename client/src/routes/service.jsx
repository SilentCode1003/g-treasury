import { createFileRoute, redirect } from '@tanstack/react-router'
import Service from '../pages/service/Service'
import { hasRouteAccess, getAccessibleRoutes } from '../utils/routeProtection'

export const Route = createFileRoute('/service')({
  beforeLoad: async () => {
    const user = JSON.parse(localStorage.getItem('user'))

    if (!user) {
      throw redirect({ to: '/' })
    }

    // Skip access check for now to debug login issue
    return
  },
  component: Service,
})

export default Service
