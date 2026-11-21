import { cookies } from 'next/headers'
import { AdminDashboard } from '@/components/admin-dashboard'
import { OwnerLogin } from '@/components/owner-login'
import { getOwnerSessionToken } from '@/lib/owner-auth'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get('am-owner-session')?.value
  const isAuthenticated = Boolean(session && session === getOwnerSessionToken())

  return isAuthenticated ? <AdminDashboard /> : <OwnerLogin />
}
