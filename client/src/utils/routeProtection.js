import { apiClient } from '../api/axios'

/**
 * Get user's route access from localStorage or fetch from API
 */
export const getUserRouteAccess = async () => {
  const user = JSON.parse(localStorage.getItem('user'))
  if (!user) return []

  // If user already has routeAccess in localStorage, return it
  if (user.routeAccess) {
    return user.routeAccess
  }

  // Otherwise fetch from API
  try {
    const response = await apiClient.get(`/route-access/access/${user.access_id}`)
    const routeAccess = (response.data?.data || []).map((route) => ({
      routeName: route.name,
      status: route.status,
    }))

    // Cache in localStorage
    user.routeAccess = routeAccess
    localStorage.setItem('user', JSON.stringify(user))

    return routeAccess
  } catch (error) {
    console.error('Error fetching route access:', error)
    return []
  }
}

/**
 * Check if user has access to a specific route
 */
export const hasRouteAccess = (routeName, user) => {
  if (!user) return false

  // If user is ADMIN, grant access to all routes
  if (user.role === 'ADMIN' || user.access_name === 'ADMIN' || user.access_id === 1) {
    return true
  }

  // Check user's route access (could be in 'routes' or 'routeAccess')
  const routeAccess = user.routes || user.routeAccess || []
  const route = routeAccess.find((r) => r.name === routeName || r.routeName === routeName)

  if (!route) return false

  // Check if status allows access (Full Access or View Only)
  return route.status === 'Full Access' || route.status === 'View Only'
}

/**
 * Get all accessible routes for a user
 */
export const getAccessibleRoutes = (user) => {
  if (!user) return []

  // Check if user has route access data (could be in 'routes' or 'routeAccess')
  const routeAccess = user.routes || user.routeAccess || []

  // If no route access data, check if user is ADMIN by access_id
  if (routeAccess.length === 0) {
    if (user.access_id === 1) {
      return [
        'dashboard',
        'company',
        'department',
        'service',
        'store',
        'parts',
        'user',
        'access',
        'statement',
      ]
    }
    return []
  }

  // Filter routes based on actual access status
  // Handle both 'name' and 'routeName' field names
  return routeAccess
    .filter((route) => route.status === 'Full Access' || route.status === 'View Only')
    .map((route) => route.name || route.routeName)
}

/**
 * Get access level for a specific route
 */
export const getAccessLevel = (routeName, user) => {
  if (!user) return 'No Access'

  // If user is ADMIN, grant full access
  if (user.role === 'ADMIN' || user.access_name === 'ADMIN') {
    return 'Full Access'
  }

  const routeAccess = user.routeAccess || []
  const route = routeAccess.find((r) => r.routeName === routeName)

  return route ? route.status : 'No Access'
}

/**
 * Check if user can create/edit on a specific route
 */
export const canCreateEdit = (routeName, user) => {
  if (!user) return false

  // If user is ADMIN, grant full access
  if (user.role === 'ADMIN' || user.access_name === 'ADMIN') {
    return true
  }

  const accessLevel = getAccessLevel(routeName, user)
  return accessLevel === 'Full Access'
}
