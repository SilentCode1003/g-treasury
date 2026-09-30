import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import { SessionProvider } from '../contexts/SessionContext'
// Optional: Import devtools for a better developer experience
// import { TanStackRouterDevtools } from '@tanstack/router-devtools'
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export const Route = createRootRouteWithContext()({
  component: RootComponent,
})

function RootComponent() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  const isAuthRoute = pathname === '/' || pathname === '/login'

  return (
    <SessionProvider>
      <main>
        <Outlet />
      </main>

      {/* <TanStackRouterDevtools /> */}
      {/* <ReactQueryDevtools /> */}
    </SessionProvider>
  )
}
