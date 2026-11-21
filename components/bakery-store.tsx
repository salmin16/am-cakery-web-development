'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { initialBakeryData, STORAGE_KEY, type BakeryCategory, type BakeryData, type BakeryProduct, type BakerySettings } from '@/lib/bakery-data'

type BakeryStoreValue = {
  data: BakeryData
  ready: boolean
  saveProduct: (product: BakeryProduct) => void
  deleteProduct: (id: string) => void
  saveCategory: (category: BakeryCategory) => void
  deleteCategory: (id: string) => void
  saveSettings: (settings: BakerySettings) => void
}

const BakeryStoreContext = createContext<BakeryStoreValue | null>(null)

export function BakeryStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<BakeryData>(initialBakeryData)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<BakeryData>
        setData({
          products: Array.isArray(parsed.products) ? parsed.products : initialBakeryData.products,
          categories: Array.isArray(parsed.categories) ? parsed.categories : initialBakeryData.categories,
          settings: { ...initialBakeryData.settings, ...parsed.settings },
        })
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      window.dispatchEvent(new CustomEvent('bakery-storage-error'))
    }
  }, [data, ready])

  const value = useMemo<BakeryStoreValue>(() => ({
    data,
    ready,
    saveProduct: (product) => setData((current) => ({ products: [product, ...current.products.filter((item) => item.id !== product.id)], categories: current.categories, settings: current.settings })),
    deleteProduct: (id) => setData((current) => ({ ...current, products: current.products.filter((item) => item.id !== id) })),
    saveCategory: (category) => setData((current) => ({ ...current, categories: [category, ...current.categories.filter((item) => item.id !== category.id)] })),
    deleteCategory: (id) => setData((current) => ({ ...current, categories: current.categories.filter((category) => category.id !== id) })),
    saveSettings: (settings) => setData((current) => ({ ...current, settings })),
  }), [data, ready])

  return <BakeryStoreContext.Provider value={value}>{children}</BakeryStoreContext.Provider>
}

export function useBakeryStore() {
  const context = useContext(BakeryStoreContext)
  if (!context) throw new Error('useBakeryStore must be used inside BakeryStoreProvider')
  return context
}
