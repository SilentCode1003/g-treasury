import { createFileRoute } from '@tanstack/react-router'
import Department from '../pages/department/Department'

export const Route = createFileRoute('/department')({
  component: Department,
})

export default Department
