import { createFileRoute, redirect } from '@tanstack/react-router'
import Parts from '../pages/parts/Parts'
import { hasRouteAccess, getAccessibleRoutes } from '../utils/routeProtection'

export const Route = createFileRoute('/parts')({
  beforeLoad: async () => {
    const user = JSON.parse(localStorage.getItem('user'))

    if (!user) {
      throw redirect({ to: '/' })
    }

    if (!hasRouteAccess('parts', user)) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: Parts,
})

export default Parts
