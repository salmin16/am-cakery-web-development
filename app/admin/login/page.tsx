import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { AdminLoginForm } from '@/components/admin-login-form'
import { SupabaseConfigNotice } from '@/components/supabase-config-notice'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Admin Sign In | AM CAKERY',
  robots: { index: false, follow: false },
}

export default async function AdminLoginPage() {
  if (!isSupabaseConfigured()) {
    return <SupabaseConfigNotice title="Configure Supabase before signing in" />
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/admin')
  }

  return (
    <Suspense fallback={<main className="auth-page"><div className="admin-loading">Loading sign-in…</div></main>}>
      <AdminLoginForm />
    </Suspense>
  )
}
