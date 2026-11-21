export const CATALOGUE_BUCKET = 'catalogue-images'

function cleanEnv(value: string | undefined): string {
  if (!value) return ''
  return value.trim().replace(/^["']|["']$/g, '').trim()
}

export const SUPABASE_URL = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, '')
export const SUPABASE_ANON_KEY = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export function getSupabaseConfigError(): string | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  }

  let parsed: URL
  try {
    parsed = new URL(SUPABASE_URL)
  } catch {
    return 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL (for example, https://your-project-ref.supabase.co).'
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return 'NEXT_PUBLIC_SUPABASE_URL must start with https://.'
  }

  if (parsed.hostname === 'supabase.com' || parsed.pathname.startsWith('/dashboard')) {
    return 'NEXT_PUBLIC_SUPABASE_URL is set to the Supabase Dashboard URL. Use the Project URL from Project Settings -> API (https://<project-ref>.supabase.co).'
  }

  return null
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfigError() === null
}

export function getSupabaseEnv(): { url: string; anonKey: string } {
  const configError = getSupabaseConfigError()
  if (configError) {
    throw new Error(configError)
  }
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY }
}
