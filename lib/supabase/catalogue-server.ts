import { initialBakeryData, type BakeryData } from '@/lib/bakery-data'
import { createClient } from '@/lib/supabase/server'
import { toCategory, toProduct, toSettings, type BakerySettingsRow, type CatalogueCategoryRow, type CatalogueItemRow } from '@/lib/supabase/catalogue'

export async function loadBakeryData(): Promise<{ data: BakeryData; configured: boolean; error: string | null }> {
  const unavailableData: BakeryData = { products: [], categories: [], settings: initialBakeryData.settings }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return { data: initialBakeryData, configured: false, error: null }

  try {
    const supabase = await createClient()
    const [itemsResult, categoriesResult, settingsResult] = await Promise.all([
      supabase.from('catalogue_items').select('id,name,description,category_id,image_url,pricing_type,base_price,options,available,published,created_at,updated_at').order('created_at', { ascending: true }),
      supabase.from('catalogue_categories').select('id,name,description,published,created_at').order('created_at', { ascending: true }),
      supabase.from('bakery_settings').select('business_name,whatsapp,location,tagline,description,logo_url').eq('id', 'default').maybeSingle(),
    ])

    if (itemsResult.error || categoriesResult.error || settingsResult.error || !settingsResult.data) {
      return { data: unavailableData, configured: true, error: 'We could not load the live catalogue. Please try again shortly.' }
    }

    return {
      data: {
        products: (itemsResult.data ?? []).map((row) => toProduct(row as CatalogueItemRow)),
        categories: (categoriesResult.data ?? []).map((row) => toCategory(row as CatalogueCategoryRow)),
        settings: toSettings(settingsResult.data as BakerySettingsRow),
      },
      configured: true,
      error: null,
    }
  } catch {
    return { data: unavailableData, configured: true, error: 'We could not load the live catalogue. Please try again shortly.' }
  }
}
