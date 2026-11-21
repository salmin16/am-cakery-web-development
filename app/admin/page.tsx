import { AdminDashboard } from '@/components/admin-dashboard'
import { OwnerLogin } from '@/components/owner-login'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return <OwnerLogin configured={false} />

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isOwner = user?.app_metadata?.role === 'owner'
  return isOwner ? <AdminDashboard /> : <OwnerLogin configured accessDenied={Boolean(user)} />
}
