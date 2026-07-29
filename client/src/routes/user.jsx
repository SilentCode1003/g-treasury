import { createFileRoute } from '@tanstack/react-router'
import User from '../pages/user/User'

export const Route = createFileRoute('/user')({
  component: User,
})

export default User
