import { createFileRoute } from '@tanstack/react-router'
import Company from '../pages/company/Company'

export const Route = createFileRoute('/company')({
  component: Company,
})

export default Company
