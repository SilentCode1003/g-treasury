import { createFileRoute } from '@tanstack/react-router'
import Statement from '../pages/statement/Statement'

export const Route = createFileRoute('/statement')({
  component: Statement,
})

export default Statement
