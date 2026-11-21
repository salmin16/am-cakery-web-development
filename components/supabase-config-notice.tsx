import Link from 'next/link'
import { ArrowLeft, Database } from 'lucide-react'
import { getSupabaseConfigError } from '@/lib/supabase/config'

type SupabaseConfigNoticeProps = {
  title?: string
  showBackLink?: boolean
}

export function SupabaseConfigNotice({
  title = 'Supabase environment variables are not configured',
  showBackLink = true,
}: SupabaseConfigNoticeProps) {
  const configError = getSupabaseConfigError()

  return (
    <main className="auth-page">
      <section className="config-notice-card" role="alert">
        <div className="config-notice-icon">
          <Database size={22} strokeWidth={1.6} />
        </div>
        <span className="eyebrow">DEVELOPER SETUP REQUIRED</span>
        <h1>{title}</h1>
        {configError && <p className="auth-error">{configError}</p>}
        <p>
          This application connects directly to Supabase for authentication, catalogue
          persistence, and cloud image storage. Add the following environment variables
          to <code>.env.local</code> (or in Vercel Project Settings → Environment Variables)
          and restart/redeploy:
        </p>
        <ul className="config-env-list">
          <li>
            <code>NEXT_PUBLIC_SUPABASE_URL</code>
          </li>
          <li>
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
          </li>
        </ul>
        <p className="config-notice-hint">
          See <code>.env.example</code> and <code>supabase/schema.sql</code> in the project
          root for setup details.
        </p>
        {showBackLink && (
          <Link href="/" className="text-link">
            <ArrowLeft size={14} /> Return to storefront
          </Link>
        )}
      </section>
    </main>
  )
}
