import { createFileRoute } from '@tanstack/react-router'
import StatementDetails from '../pages/statement/StatementDetails'

export const Route = createFileRoute('/statement/$id')({
  component: StatementDetails,
})

export default StatementDetails
