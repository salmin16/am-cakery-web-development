import { BakerySite } from '@/components/bakery-site'
import type { BakeryData } from '@/lib/bakery-data'
import { fetchBakeryData } from '@/lib/supabase/catalogue'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function Page() {
  let initialData: BakeryData | null = null
  let initialError: string | null = null

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient()
      initialData = await fetchBakeryData(supabase)
    } catch (reason) {
      initialError =
        reason instanceof Error
          ? reason.message
          : 'Unable to load the menu from Supabase.'
    }
  }

  return <BakerySite initialData={initialData} initialError={initialError} />
}
