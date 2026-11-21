export type PriceOption = {
  id: string
  name: string
  price: number
  description?: string
}

export type BakeryProduct = {
  id: string
  name: string
  description: string
  categoryId: string
  imageUrl: string
  pricingType: 'single' | 'options'
  basePrice: number
  options: PriceOption[]
  available: boolean
  published: boolean
  createdAt: string
  updatedAt: string
}

export type BakeryCategory = {
  id: string
  name: string
  description: string
  published: boolean
  createdAt: string
}

export type BakerySettings = {
  businessName: string
  whatsapp: string
  location: string
  tagline: string
  description: string
  logoUrl: string
}

export type BakeryData = {
  products: BakeryProduct[]
  categories: BakeryCategory[]
  settings: BakerySettings
}

export type CartLine = {
  key: string
  productId: string
  optionId: string | null
  quantity: number
}

export const defaultBakerySettings: BakerySettings = {
  businessName: 'AM CAKERY',
  whatsapp: '255786169647',
  location: 'Ubungo Riverside, Dar es Salaam',
  tagline: 'Freshly Baked. Beautifully Made.',
  description:
    'AM CAKERY is a bakery based in Ubungo Riverside, Dar es Salaam, creating cakes, snacks and other freshly baked treats for everyday moments and special occasions.',
  logoUrl: '/am-cakery-logo.png',
}

export const emptyBakeryData: BakeryData = {
  products: [],
  categories: [],
  settings: defaultBakerySettings,
}

export function formatTzs(value: number) {
  return `TZS ${new Intl.NumberFormat('en-TZ').format(Number.isFinite(value) ? value : 0)}`
}

export function getDisplayPrice(product: BakeryProduct): { from: boolean; amount: number } {
  if (product.pricingType === 'options' && product.options.length > 0) {
    return {
      from: true,
      amount: Math.min(...product.options.map((option) => option.price)),
    }
  }
  return { from: false, amount: product.basePrice }
}

export function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
