import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { AdminDashboard } from '@/components/admin-dashboard'
import { SupabaseConfigNotice } from '@/components/supabase-config-notice'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Business Dashboard | AM CAKERY',
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  if (!isSupabaseConfigured()) {
    return <SupabaseConfigNotice title="Configure Supabase to access the dashboard" />
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  return <AdminDashboard adminEmail={user.email ?? 'Administrator'} />
}
