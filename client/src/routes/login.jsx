import { createFileRoute } from '@tanstack/react-router'
import BillingLogin from '../pages/login/Login'

export const Route = createFileRoute('/login')({
  component: BillingLogin,
})

export default BillingLogin
