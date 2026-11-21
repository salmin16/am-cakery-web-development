'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  emptyBakeryData,
  type BakeryCategory,
  type BakeryData,
  type BakeryProduct,
  type BakerySettings,
} from '@/lib/bakery-data'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import {
  deleteCatalogueItem,
  deleteCategoryAndReassign,
  fetchBakeryData,
  upsertBusinessSettings,
  upsertCatalogueItem,
  upsertCategory,
} from '@/lib/supabase/catalogue'
import { deleteCatalogueImageByUrl } from '@/lib/supabase/storage'

type BakeryStoreValue = {
  data: BakeryData
  loading: boolean
  ready: boolean
  error: string | null
  configured: boolean
  refresh: () => Promise<void>
  saveProduct: (product: BakeryProduct) => Promise<BakeryProduct>
  deleteProduct: (id: string) => Promise<void>
  saveCategory: (category: BakeryCategory) => Promise<BakeryCategory>
  deleteCategory: (id: string, fallbackCategoryId: string | null) => Promise<void>
  saveSettings: (settings: BakerySettings) => Promise<BakerySettings>
}

const BakeryStoreContext = createContext<BakeryStoreValue | null>(null)

export function BakeryStoreProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured()
  const [data, setData] = useState<BakeryData>(emptyBakeryData)
  const [loading, setLoading] = useState<boolean>(configured)
  const [ready, setReady] = useState<boolean>(!configured)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setLoading(false)
      setReady(true)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const nextData = await fetchBakeryData(supabase)
      setData(nextData)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Unable to connect to the catalogue database. Please try again.'
      )
    } finally {
      setLoading(false)
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) return

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        void refresh()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [refresh])

  const saveProduct = useCallback(async (product: BakeryProduct) => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      throw new Error('Supabase is not configured.')
    }

    const saved = await upsertCatalogueItem(supabase, product)
    setData((current) => ({
      ...current,
      products: [saved, ...current.products.filter((item) => item.id !== saved.id)],
    }))
    return saved
  }, [])

  const deleteProduct = useCallback(
    async (id: string) => {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) {
        throw new Error('Supabase is not configured.')
      }

      const target = data.products.find((item) => item.id === id)
      await deleteCatalogueItem(supabase, id)

      setData((current) => ({
        ...current,
        products: current.products.filter((item) => item.id !== id),
      }))

      // Clean up the deleted item's photo from Supabase Storage if no other item uses it.
      if (target?.imageUrl) {
        const stillReferenced = data.products.some(
          (item) => item.id !== id && item.imageUrl === target.imageUrl
        )
        if (!stillReferenced) {
          await deleteCatalogueImageByUrl(supabase, target.imageUrl)
        }
      }
    },
    [data.products]
  )

  const saveCategory = useCallback(async (category: BakeryCategory) => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      throw new Error('Supabase is not configured.')
    }

    const saved = await upsertCategory(supabase, category)
    setData((current) => {
      const exists = current.categories.some((item) => item.id === saved.id)
      const categories = exists
        ? current.categories.map((item) => (item.id === saved.id ? saved : item))
        : [...current.categories, saved]
      return { ...current, categories }
    })
    return saved
  }, [])

  const deleteCategory = useCallback(
    async (id: string, fallbackCategoryId: string | null) => {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) {
        throw new Error('Supabase is not configured.')
      }

      await deleteCategoryAndReassign(supabase, id, fallbackCategoryId)
      setData((current) => ({
        ...current,
        categories: current.categories.filter((category) => category.id !== id),
        products: current.products.map((product) =>
          product.categoryId === id
            ? { ...product, categoryId: fallbackCategoryId ?? '' }
            : product
        ),
      }))
    },
    []
  )

  const saveSettings = useCallback(async (settings: BakerySettings) => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      throw new Error('Supabase is not configured.')
    }

    const saved = await upsertBusinessSettings(supabase, settings)
    setData((current) => ({ ...current, settings: saved }))
    return saved
  }, [])

  const value = useMemo<BakeryStoreValue>(
    () => ({
      data,
      loading,
      ready,
      error,
      configured,
      refresh,
      saveProduct,
      deleteProduct,
      saveCategory,
      deleteCategory,
      saveSettings,
    }),
    [
      data,
      loading,
      ready,
      error,
      configured,
      refresh,
      saveProduct,
      deleteProduct,
      saveCategory,
      deleteCategory,
      saveSettings,
    ]
  )

  return <BakeryStoreContext.Provider value={value}>{children}</BakeryStoreContext.Provider>
}

export function useBakeryStore() {
  const context = useContext(BakeryStoreContext)
  if (!context) throw new Error('useBakeryStore must be used inside BakeryStoreProvider')
  return context
}
