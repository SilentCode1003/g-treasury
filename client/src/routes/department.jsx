import { createFileRoute, redirect } from '@tanstack/react-router'
import Department from '../pages/department/Department'
import { hasRouteAccess, getAccessibleRoutes } from '../utils/routeProtection'

export const Route = createFileRoute('/department')({
  beforeLoad: async () => {
    const user = JSON.parse(localStorage.getItem('user'))

    if (!user) {
      throw redirect({ to: '/' })
    }

    // Skip access check for now to debug login issue
    return
  },
  component: Department,
})

export default Department
