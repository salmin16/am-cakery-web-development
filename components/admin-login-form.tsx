'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setError('Please enter your administrator email and password.')
      return
    }

    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setError('Authentication service is not configured.')
      return
    }

    setSubmitting(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })

      if (signInError) {
        setError(
          signInError.message === 'Invalid login credentials'
            ? 'Invalid email or password. Please try again.'
            : signInError.message
        )
        setSubmitting(false)
        return
      }

      const rawNext = searchParams.get('next')
      const destination =
        rawNext && rawNext.startsWith('/admin') && rawNext !== '/admin/login'
          ? rawNext
          : '/admin'

      router.replace(destination)
      router.refresh()
    } catch {
      setError('Unable to reach the authentication service. Please check your connection.')
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="admin-signin-title">
        <div className="auth-header">
          <Image
            src="/am-cakery-logo.png"
            alt="AM CAKERY logo"
            width={62}
            height={62}
            className="auth-logo"
            priority
          />
          <span className="eyebrow">OWNER&apos;S CORNER</span>
          <h1 id="admin-signin-title">Administrator Sign In</h1>
          <p>Sign in with your authorized AM CAKERY account to manage the live catalogue.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label>
            Email address
            <span className="auth-input-wrap">
              <Mail size={15} aria-hidden="true" />
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="owner@amcakery.com"
                disabled={submitting}
              />
            </span>
          </label>

          <label>
            Password
            <span className="auth-input-wrap">
              <Lock size={15} aria-hidden="true" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                disabled={submitting}
              />
              <button
                type="button"
                className="auth-toggle-password"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={submitting}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </span>
          </label>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="button button-dark auth-submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 size={15} className="spin" /> Signing in…
              </>
            ) : (
              'Sign in to dashboard'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>Access is strictly limited to pre-authorized administrators.</p>
          <Link href="/" className="text-link">
            <ArrowLeft size={14} /> Return to public storefront
          </Link>
        </div>
      </section>
    </main>
  )
}
