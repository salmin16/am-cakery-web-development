import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseEnv, isSupabaseConfigured } from './config'

let browserClient: SupabaseClient | null = null

export function createSupabaseBrowserClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv()
  return createBrowserClient(url, anonKey)
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (typeof window === 'undefined') {
    return createSupabaseBrowserClient()
  }
  if (!browserClient) {
    browserClient = createSupabaseBrowserClient()
  }
  return browserClient
}
