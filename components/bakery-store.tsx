'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { type BakeryCategory, type BakeryData, type BakeryProduct, type BakerySettings } from '@/lib/bakery-data'
import { createClient } from '@/lib/supabase/client'
import { categoryToRow, productToRow, settingsToRow } from '@/lib/supabase/catalogue'
import { deleteCatalogueImage } from '@/lib/supabase/storage'

type BakeryStoreValue = {
  data: BakeryData
  ready: boolean
  configured: boolean
  loadError: string | null
  saveProduct: (product: BakeryProduct) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  saveCategory: (category: BakeryCategory) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  saveSettings: (settings: BakerySettings) => Promise<void>
}

const BakeryStoreContext = createContext<BakeryStoreValue | null>(null)

export function BakeryStoreProvider({ children, initialData, configured, loadError }: { children: ReactNode; initialData: BakeryData; configured: boolean; loadError: string | null }) {
  const [data, setData] = useState(initialData)
  const client = useMemo(() => configured ? createClient() : null, [configured])

  const value = useMemo<BakeryStoreValue>(() => ({
    data,
    ready: true,
    configured,
    loadError,
    async saveProduct(product) {
      if (!client) throw new Error('Supabase is not configured. Catalogue changes cannot be saved.')
      const previous = data.products.find((item) => item.id === product.id)
      const { error } = await client.from('catalogue_items').upsert(productToRow(product), { onConflict: 'id' })
      if (error) throw new Error('Could not save this product. Check that you are signed in and try again.')
      setData((current) => ({ ...current, products: [product, ...current.products.filter((item) => item.id !== product.id)] }))
      if (previous && previous.imageUrl !== product.imageUrl) void deleteCatalogueImage(previous.imageUrl).catch(() => undefined)
    },
    async deleteProduct(id) {
      if (!client) throw new Error('Supabase is not configured. Catalogue changes cannot be saved.')
      const previous = data.products.find((item) => item.id === id)
      const { error } = await client.from('catalogue_items').delete().eq('id', id)
      if (error) throw new Error('Could not delete this product. Check that you are signed in and try again.')
      setData((current) => ({ ...current, products: current.products.filter((item) => item.id !== id) }))
      if (previous) void deleteCatalogueImage(previous.imageUrl).catch(() => undefined)
    },
    async saveCategory(category) {
      if (!client) throw new Error('Supabase is not configured. Catalogue changes cannot be saved.')
      const { error } = await client.from('catalogue_categories').upsert(categoryToRow(category), { onConflict: 'id' })
      if (error) throw new Error('Could not save this category. Check that you are signed in and try again.')
      setData((current) => ({ ...current, categories: [category, ...current.categories.filter((item) => item.id !== category.id)] }))
    },
    async deleteCategory(id) {
      if (!client) throw new Error('Supabase is not configured. Catalogue changes cannot be saved.')
      const { error } = await client.from('catalogue_categories').delete().eq('id', id)
      if (error) throw new Error('Could not delete this category. Move its products to another category first.')
      setData((current) => ({ ...current, categories: current.categories.filter((category) => category.id !== id) }))
    },
    async saveSettings(settings) {
      if (!client) throw new Error('Supabase is not configured. Business details cannot be saved.')
      const previousLogo = data.settings.logoUrl
      const { error } = await client.from('bakery_settings').upsert(settingsToRow(settings), { onConflict: 'id' })
      if (error) throw new Error('Could not save business details. Check that you are signed in and try again.')
      setData((current) => ({ ...current, settings }))
      if (previousLogo !== settings.logoUrl) void deleteCatalogueImage(previousLogo).catch(() => undefined)
    },
  }), [client, configured, data, loadError])

  return <BakeryStoreContext.Provider value={value}>{children}</BakeryStoreContext.Provider>
}

export function useBakeryStore() {
  const context = useContext(BakeryStoreContext)
  if (!context) throw new Error('useBakeryStore must be used inside BakeryStoreProvider')
  return context
}
