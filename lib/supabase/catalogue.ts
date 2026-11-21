import type { SupabaseClient } from '@supabase/supabase-js'
import {
  defaultBakerySettings,
  type BakeryCategory,
  type BakeryData,
  type BakeryProduct,
  type BakerySettings,
  type PriceOption,
} from '@/lib/bakery-data'

type CatalogueItemRow = {
  id: string
  name: string
  description: string | null
  category_id: string | null
  image_url: string | null
  pricing_type: 'single' | 'options'
  base_price: number
  options: unknown
  available: boolean
  published: boolean
  created_at: string
  updated_at: string
}

type CatalogueCategoryRow = {
  id: string
  name: string
  description: string | null
  published: boolean
  created_at: string
  updated_at?: string
}

type BusinessSettingsRow = {
  id: string
  business_name: string
  whatsapp: string
  location: string
  tagline: string
  description: string
  logo_url: string
}

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    Boolean(error.message && /could not find the table|does not exist/i.test(error.message))
  )
}

function parsePriceOptions(raw: unknown): PriceOption[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null
    )
    .map((item, index) => ({
      id: typeof item.id === 'string' && item.id ? item.id : `opt-${index}`,
      name: typeof item.name === 'string' ? item.name : '',
      price: Number(item.price) || 0,
      ...(typeof item.description === 'string' && item.description
        ? { description: item.description }
        : {}),
    }))
}

function mapItemRowToProduct(row: CatalogueItemRow): BakeryProduct {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    categoryId: row.category_id ?? '',
    imageUrl: row.image_url ?? '',
    pricingType: row.pricing_type === 'options' ? 'options' : 'single',
    basePrice: Number(row.base_price) || 0,
    options: parsePriceOptions(row.options),
    available: Boolean(row.available),
    published: Boolean(row.published),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapCategoryRowToCategory(row: CatalogueCategoryRow): BakeryCategory {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    published: Boolean(row.published),
    createdAt: row.created_at,
  }
}

function mapSettingsRowToSettings(row: BusinessSettingsRow | null): BakerySettings {
  if (!row) return defaultBakerySettings
  return {
    businessName: row.business_name || defaultBakerySettings.businessName,
    whatsapp: row.whatsapp || defaultBakerySettings.whatsapp,
    location: row.location || defaultBakerySettings.location,
    tagline: row.tagline || defaultBakerySettings.tagline,
    description: row.description ?? defaultBakerySettings.description,
    logoUrl: row.logo_url || defaultBakerySettings.logoUrl,
  }
}

function deriveFallbackCategories(products: BakeryProduct[]): BakeryCategory[] {
  const seen = new Set<string>()
  const categories: BakeryCategory[] = []
  for (const product of products) {
    const id = product.categoryId.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    categories.push({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1).replace(/[-_]+/g, ' '),
      description: '',
      published: true,
      createdAt: product.createdAt,
    })
  }
  return categories
}

export async function fetchBakeryData(supabase: SupabaseClient): Promise<BakeryData> {
  const [itemsResult, categoriesResult, settingsResult] = await Promise.all([
    supabase
      .from('catalogue_items')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('catalogue_categories')
      .select('*')
      .order('created_at', { ascending: true }),
    supabase
      .from('business_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle(),
  ])

  if (itemsResult.error) {
    if (isMissingTableError(itemsResult.error)) {
      throw new Error(
        'The "catalogue_items" table does not exist in Supabase yet. Run supabase/schema.sql in your Supabase SQL Editor.'
      )
    }
    throw new Error(`Unable to load catalogue items: ${itemsResult.error.message}`)
  }

  const products = ((itemsResult.data ?? []) as CatalogueItemRow[]).map(mapItemRowToProduct)

  let categories: BakeryCategory[]
  if (categoriesResult.error) {
    if (isMissingTableError(categoriesResult.error)) {
      categories = deriveFallbackCategories(products)
    } else {
      throw new Error(`Unable to load categories: ${categoriesResult.error.message}`)
    }
  } else {
    categories = ((categoriesResult.data ?? []) as CatalogueCategoryRow[]).map(
      mapCategoryRowToCategory
    )
  }

  let settings: BakerySettings
  if (settingsResult.error) {
    if (isMissingTableError(settingsResult.error)) {
      settings = defaultBakerySettings
    } else {
      throw new Error(`Unable to load business settings: ${settingsResult.error.message}`)
    }
  } else {
    settings = mapSettingsRowToSettings(
      (settingsResult.data ?? null) as BusinessSettingsRow | null
    )
  }

  return { products, categories, settings }
}

export async function upsertCatalogueItem(
  supabase: SupabaseClient,
  product: BakeryProduct
): Promise<BakeryProduct> {
  const payload = {
    id: product.id,
    name: product.name.trim(),
    description: product.description.trim(),
    category_id: product.categoryId || null,
    image_url: product.imageUrl,
    pricing_type: product.pricingType,
    base_price: product.pricingType === 'single' ? Math.round(Number(product.basePrice) || 0) : 0,
    options:
      product.pricingType === 'options'
        ? product.options.map((option) => ({
            id: option.id,
            name: option.name.trim(),
            price: Math.round(Number(option.price) || 0),
            ...(option.description ? { description: option.description } : {}),
          }))
        : [],
    available: product.available,
    published: product.published,
  }

  const { data, error } = await supabase
    .from('catalogue_items')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single()

  if (error) {
    throw new Error(`Unable to save product: ${error.message}`)
  }

  return mapItemRowToProduct(data as CatalogueItemRow)
}

export async function deleteCatalogueItem(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from('catalogue_items').delete().eq('id', id)
  if (error) {
    throw new Error(`Unable to delete product: ${error.message}`)
  }
}

export async function upsertCategory(
  supabase: SupabaseClient,
  category: BakeryCategory
): Promise<BakeryCategory> {
  const payload = {
    id: category.id,
    name: category.name.trim(),
    description: category.description.trim(),
    published: category.published,
  }

  const { data, error } = await supabase
    .from('catalogue_categories')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single()

  if (error) {
    throw new Error(`Unable to save category: ${error.message}`)
  }

  return mapCategoryRowToCategory(data as CatalogueCategoryRow)
}

export async function deleteCategoryAndReassign(
  supabase: SupabaseClient,
  categoryId: string,
  fallbackCategoryId: string | null
): Promise<void> {
  const { error: reassignError } = await supabase
    .from('catalogue_items')
    .update({ category_id: fallbackCategoryId })
    .eq('category_id', categoryId)

  if (reassignError) {
    throw new Error(`Unable to move products out of category: ${reassignError.message}`)
  }

  const { error: deleteError } = await supabase
    .from('catalogue_categories')
    .delete()
    .eq('id', categoryId)

  if (deleteError) {
    throw new Error(`Unable to delete category: ${deleteError.message}`)
  }
}

export async function upsertBusinessSettings(
  supabase: SupabaseClient,
  settings: BakerySettings
): Promise<BakerySettings> {
  const payload = {
    id: 'default',
    business_name: settings.businessName.trim(),
    whatsapp: settings.whatsapp.replace(/\D/g, ''),
    location: settings.location.trim(),
    tagline: settings.tagline.trim(),
    description: settings.description.trim(),
    logo_url: settings.logoUrl,
  }

  const { data, error } = await supabase
    .from('business_settings')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single()

  if (error) {
    throw new Error(`Unable to save business settings: ${error.message}`)
  }

  return mapSettingsRowToSettings(data as BusinessSettingsRow)
}
