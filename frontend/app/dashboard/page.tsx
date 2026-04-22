import { redirect } from 'next/navigation'

export default function DashboardIndexRoute() {
  redirect('/dashboard/overview')
}
