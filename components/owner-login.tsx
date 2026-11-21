'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function OwnerLogin({ configured = true, accessDenied = false }: { configured?: boolean; accessDenied?: boolean }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { error: signInError } = await createClient().auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      router.replace('/admin')
      router.refresh()
    } catch {
      setError('Sign-in failed. Check your email and password, or contact your Supabase project administrator.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="owner-login-page"><form className="owner-login-card" onSubmit={submit}><span className="eyebrow">AM CAKERY · PRIVATE</span><h1>Owner&apos;s corner</h1><p>Sign in with your owner account to manage the bakery.</p>{!configured && <p className="owner-login-error" role="alert">Supabase is not configured for this local environment. Add the required Supabase variables to enable sign-in and cloud-saved catalogue changes.</p>}{accessDenied && <p className="owner-login-error" role="alert">This account does not have owner access. Set its Supabase app metadata role to <code>owner</code> to manage this catalogue.</p>}<label htmlFor="owner-email">Email address</label><input id="owner-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus disabled={!configured} /><label htmlFor="owner-password">Password</label><input id="owner-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={!configured} />{error && <p className="owner-login-error" role="alert">{error}</p>}<button className="button button-dark" type="submit" disabled={busy || !configured}>{busy ? 'Signing in…' : 'Sign in'}</button>{accessDenied && <button className="button button-outline" type="button" onClick={async () => { await createClient().auth.signOut(); router.refresh() }}>Sign out of this account</button>}<a href="/" className="owner-login-back">Back to the bakery</a></form></main>
}
