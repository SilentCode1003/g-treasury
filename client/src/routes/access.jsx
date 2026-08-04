import { createFileRoute, redirect } from '@tanstack/react-router'
import Access from '../pages/access/Access'
import { hasRouteAccess, getAccessibleRoutes } from '../utils/routeProtection'

export const Route = createFileRoute('/access')({
  beforeLoad: async () => {
    const user = JSON.parse(localStorage.getItem('user'))

    if (!user) {
      throw redirect({ to: '/' })
    }

    // Skip access check for now to debug login issue
    return
  },
  component: Access,
})

export default Access
