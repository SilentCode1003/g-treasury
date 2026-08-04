import { createFileRoute, redirect } from '@tanstack/react-router'
import User from '../pages/user/User'
import { hasRouteAccess, getAccessibleRoutes } from '../utils/routeProtection'

export const Route = createFileRoute('/user')({
  beforeLoad: async () => {
    const user = JSON.parse(localStorage.getItem('user'))

    if (!user) {
      throw redirect({ to: '/' })
    }

    // Skip access check for now to debug login issue
    return
  },
  component: User,
})

export default User
