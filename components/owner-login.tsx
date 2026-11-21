'use client'

import { useState, type FormEvent } from 'react'

export function OwnerLogin() {
  const [passkey, setPasskey] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/owner-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey }),
      })
      if (response.ok) window.location.reload()
      else setError('That passkey is not correct. Please try again.')
    } catch {
      setError('Unable to verify your passkey right now. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="owner-login-page"><form className="owner-login-card" onSubmit={submit}><span className="eyebrow">AM CAKERY · PRIVATE</span><h1>Owner&apos;s corner</h1><p>Enter your passkey to continue to the business dashboard.</p><label htmlFor="owner-passkey">Passkey</label><input id="owner-passkey" type="password" autoComplete="current-password" value={passkey} onChange={(event) => setPasskey(event.target.value)} required autoFocus />{error && <p className="owner-login-error" role="alert">{error}</p>}<button className="button button-dark" type="submit" disabled={busy}>{busy ? 'Checking…' : 'Enter owner area'}</button><a href="/" className="owner-login-back">Back to the bakery</a></form></main>
}
