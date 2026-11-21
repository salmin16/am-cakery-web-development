export type PriceOption = { id: string; name: string; price: number; description?: string }

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

const now = '2026-11-21T00:00:00.000Z'

export const initialBakeryData: BakeryData = {
  categories: [
    { id: 'cakes', name: 'Cakes', description: 'Celebration cakes, made with care.', published: true, createdAt: now },
    { id: 'sambusa', name: 'Sambusa', description: 'Golden savoury favourites.', published: true, createdAt: now },
    { id: 'donuts', name: 'Donuts', description: 'Freshly baked little treats.', published: true, createdAt: now },
    { id: 'snacks', name: 'Snacks', description: 'Something lovely for every day.', published: true, createdAt: now },
    { id: 'other', name: 'Other', description: 'More from our kitchen.', published: true, createdAt: now },
  ],
  settings: {
    businessName: 'AM CAKERY',
    whatsapp: '255786169647',
    location: 'Ubungo Riverside, Dar es Salaam',
    tagline: 'Freshly Baked. Beautifully Made.',
    description: 'AM CAKERY is a bakery based in Ubungo Riverside, Dar es Salaam, creating cakes, snacks and other freshly baked treats for everyday moments and special occasions.',
    logoUrl: '/am-cakery-logo.png',
  },
  products: [
    {
      id: 'chocolate-cake', name: 'Chocolate Cake', description: 'Deep cocoa, tender crumb and a little celebration in every slice.', categoryId: 'cakes', imageUrl: '/chocolate-cake.png', pricingType: 'options', basePrice: 0,
      options: [
        { id: 'half-kg', name: '0.5 kg', price: 20000 }, { id: 'one-kg', name: '1 kg', price: 35000 },
        { id: 'one-half-kg', name: '1.5 kg', price: 50000 }, { id: 'two-kg', name: '2 kg', price: 65000 },
      ], available: true, published: true, createdAt: now, updatedAt: now,
    },
    {
      id: 'vanilla-cake', name: 'Vanilla Cake', description: 'Soft vanilla layers with a delicate, buttery finish.', categoryId: 'cakes', imageUrl: '/vanilla-cake.png', pricingType: 'options', basePrice: 0,
      options: [
        { id: 'half-kg', name: '0.5 kg', price: 18000 }, { id: 'one-kg', name: '1 kg', price: 30000 },
        { id: 'one-half-kg', name: '1.5 kg', price: 43000 }, { id: 'two-kg', name: '2 kg', price: 55000 },
      ], available: true, published: true, createdAt: now, updatedAt: now,
    },
    {
      id: 'sambusa', name: 'Sambusa', description: 'Golden, crisp pastry with a savoury centre. Sold per piece.', categoryId: 'sambusa', imageUrl: '/sambusa.png', pricingType: 'single', basePrice: 1000,
      options: [], available: true, published: true, createdAt: now, updatedAt: now,
    },
    {
      id: 'donut', name: 'Donut', description: 'A soft, freshly made treat with a light cocoa drizzle.', categoryId: 'donuts', imageUrl: '/donut.png', pricingType: 'single', basePrice: 1500,
      options: [], available: true, published: true, createdAt: now, updatedAt: now,
    },
  ],
}

export function formatTzs(value: number) {
  return `TZS ${new Intl.NumberFormat('en-TZ').format(value)}`
}

export function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
