import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import BillingLogin from '../pages/login/Login'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  // Render the login UI at the root so first load shows the login page
  return <BillingLogin />
}
