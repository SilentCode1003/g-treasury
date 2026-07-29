import { createFileRoute } from '@tanstack/react-router'
import Service from '../pages/service/Service'

export const Route = createFileRoute('/service')({
  component: Service,
})

export default Service
