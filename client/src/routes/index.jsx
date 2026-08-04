import React from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import BillingLogin from '../pages/login/Login'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const user = JSON.parse(localStorage.getItem('user'))
    if (user) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: Index,
})

function Index() {
  // Render the login UI at the root so first load shows the login page
  return <BillingLogin />
}
