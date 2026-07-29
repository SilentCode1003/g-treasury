import { createFileRoute } from '@tanstack/react-router'
import Store from '../pages/store/Store'

export const Route = createFileRoute('/store')({
  component: Store,
})

export default Store
