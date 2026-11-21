import { type BakeryCategory, type BakeryProduct, type BakerySettings, type PriceOption } from '@/lib/bakery-data'

export type CatalogueItemRow = {
  id: string
  name: string
  description: string
  category_id: string
  image_url: string
  pricing_type: 'single' | 'options'
  base_price: number | string
  options: PriceOption[] | null
  available: boolean
  published: boolean
  created_at: string
  updated_at: string
}

export type CatalogueCategoryRow = {
  id: string
  name: string
  description: string
  published: boolean
  created_at: string
}

export type BakerySettingsRow = {
  business_name: string
  whatsapp: string
  location: string
  tagline: string
  description: string
  logo_url: string
}

export function toProduct(row: CatalogueItemRow): BakeryProduct {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    categoryId: row.category_id,
    imageUrl: row.image_url,
    pricingType: row.pricing_type,
    basePrice: Number(row.base_price),
    options: Array.isArray(row.options) ? row.options : [],
    available: row.available,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toCategory(row: CatalogueCategoryRow): BakeryCategory {
  return { id: row.id, name: row.name, description: row.description, published: row.published, createdAt: row.created_at }
}

export function toSettings(row: BakerySettingsRow): BakerySettings {
  return {
    businessName: row.business_name,
    whatsapp: row.whatsapp,
    location: row.location,
    tagline: row.tagline,
    description: row.description,
    logoUrl: row.logo_url,
  }
}

export function productToRow(product: BakeryProduct) {
  return {
    id: product.id,
    name: product.name.trim(),
    description: product.description.trim(),
    category_id: product.categoryId,
    image_url: product.imageUrl,
    pricing_type: product.pricingType,
    base_price: product.basePrice,
    options: product.options,
    available: product.available,
    published: product.published,
    created_at: product.createdAt,
    updated_at: product.updatedAt,
  }
}

export function categoryToRow(category: BakeryCategory) {
  return {
    id: category.id,
    name: category.name.trim(),
    description: category.description.trim(),
    published: category.published,
    created_at: category.createdAt,
  }
}

export function settingsToRow(settings: BakerySettings) {
  return {
    id: 'default',
    business_name: settings.businessName.trim(),
    whatsapp: settings.whatsapp.trim(),
    location: settings.location.trim(),
    tagline: settings.tagline.trim(),
    description: settings.description.trim(),
    logo_url: settings.logoUrl,
    updated_at: new Date().toISOString(),
  }
}
