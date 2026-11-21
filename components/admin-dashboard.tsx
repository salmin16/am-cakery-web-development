'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  FolderOpen,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  Tag,
  Trash2,
  Upload,
  UserCheck,
  X,
} from 'lucide-react'
import {
  formatTzs,
  getDisplayPrice,
  makeId,
  type BakeryCategory,
  type BakeryProduct,
  type PriceOption,
} from '@/lib/bakery-data'
import { useBakeryStore } from '@/components/bakery-store'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { deleteCatalogueImageByUrl, uploadCatalogueImage } from '@/lib/supabase/storage'

type Section = 'overview' | 'products' | 'categories' | 'settings'

const emptyProduct = (categoryId: string): BakeryProduct => ({
  id: '',
  name: '',
  description: '',
  categoryId,
  imageUrl: '',
  pricingType: 'single',
  basePrice: 0,
  options: [],
  available: true,
  published: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

function ImagePicker({
  value,
  onUploaded,
  onRemove,
  label,
  disabled,
}: {
  value: string
  onUploaded: (publicUrl: string) => void
  onRemove: () => void
  label: string
  disabled?: boolean
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setError('Supabase Storage is not configured.')
      return
    }

    setUploading(true)
    setError('')
    try {
      const { publicUrl } = await uploadCatalogueImage(supabase, file, 'products')
      onUploaded(publicUrl)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to upload that image.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="image-picker">
      <span className="form-label">{label}</span>
      <div className="image-picker-row">
        <div className="image-picker-preview">
          {uploading ? (
            <Loader2 size={24} className="spin" aria-label="Uploading image" />
          ) : value ? (
            <Image src={value} alt="Selected catalogue image preview" fill sizes="100px" unoptimized />
          ) : (
            <ImagePlus size={26} />
          )}
        </div>
        <div className="image-picker-actions">
          <label
            className={`button button-outline upload-button ${uploading || disabled ? 'upload-disabled' : ''}`}
          >
            {uploading ? (
              <>
                <Loader2 size={15} className="spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload size={15} /> Upload image
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleChange}
              disabled={uploading || disabled}
            />
          </label>
          {value && !uploading && (
            <button
              type="button"
              className="text-button destructive-text"
              onClick={onRemove}
              disabled={disabled}
            >
              Remove image
            </button>
          )}
          <small>Images are optimized and stored securely in Supabase Storage.</small>
        </div>
      </div>
      {error && (
        <span className="form-error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

export function AdminDashboard({ adminEmail }: { adminEmail: string }) {
  const router = useRouter()
  const {
    data,
    loading,
    ready,
    error: storeError,
    refresh,
    saveProduct,
    deleteProduct,
    saveCategory,
    deleteCategory,
    saveSettings,
  } = useBakeryStore()

  const [section, setSectionState] = useState<Section>('overview')
  const [editingProduct, setEditingProduct] = useState<BakeryProduct | null>(null)
  const [editingCategory, setEditingCategory] = useState<BakeryCategory | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [settingsDraft, setSettingsDraft] = useState(data.settings)
  const [feedback, setFeedback] = useState('')
  const [actionError, setActionError] = useState('')
  const [productFormError, setProductFormError] = useState('')
  const [search, setSearch] = useState('')

  const [savingProduct, setSavingProduct] = useState(false)
  const [savingCategory, setSavingCategory] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  // Track original & newly uploaded images so replaced/cancelled files are cleaned up.
  const originalProductImageRef = useRef<string>('')
  const uncommittedProductImageRef = useRef<string | null>(null)
  const uncommittedLogoRef = useRef<string | null>(null)

  const counts = useMemo(
    () => ({
      products: data.products.length,
      published: data.products.filter((product) => product.published).length,
      hidden: data.products.filter((product) => !product.published).length,
      categories: data.categories.length,
    }),
    [data]
  )

  const filteredProducts = data.products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    if (ready) {
      setSettingsDraft(data.settings)
    }
  }, [data.settings, ready])

  async function cleanupUncommittedImage(ref: { current: string | null }) {
    const url = ref.current
    ref.current = null
    if (!url) return
    const supabase = getSupabaseBrowserClient()
    if (supabase) {
      await deleteCatalogueImageByUrl(supabase, url)
    }
  }

  function openProductEditor(product: BakeryProduct) {
    originalProductImageRef.current = product.imageUrl
    uncommittedProductImageRef.current = null
    setProductFormError('')
    setEditingProduct(product)
  }

  function closeProductEditor() {
    if (savingProduct) return
    void cleanupUncommittedImage(uncommittedProductImageRef)
    setEditingProduct(null)
    setProductFormError('')
  }

  function handleProductImageUploaded(publicUrl: string) {
    // Delete any previously uploaded uncommitted image in this modal session.
    void cleanupUncommittedImage(uncommittedProductImageRef)
    uncommittedProductImageRef.current = publicUrl
    setEditingProduct((current) => (current ? { ...current, imageUrl: publicUrl } : current))
  }

  function handleProductImageRemoved() {
    void cleanupUncommittedImage(uncommittedProductImageRef)
    setEditingProduct((current) => (current ? { ...current, imageUrl: '' } : current))
  }

  function addOption() {
    setEditingProduct((current) =>
      current
        ? { ...current, options: [...current.options, { id: makeId(), name: '', price: 0 }] }
        : current
    )
  }

  function updateOption(id: string, field: keyof PriceOption, value: string) {
    setEditingProduct((current) =>
      current
        ? {
            ...current,
            options: current.options.map((option) =>
              option.id === id
                ? { ...option, [field]: field === 'price' ? Number(value) : value }
                : option
            ),
          }
        : current
    )
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingProduct || savingProduct) return

    setProductFormError('')
    setActionError('')

    const validOptions =
      editingProduct.pricingType === 'options'
        ? editingProduct.options.filter((option) => option.name.trim() && option.price > 0)
        : []

    if (!editingProduct.name.trim()) {
      setProductFormError('Please enter a product name.')
      return
    }
    if (!editingProduct.categoryId) {
      setProductFormError('Please choose a category for this product.')
      return
    }
    if (editingProduct.pricingType === 'single' && Number(editingProduct.basePrice) <= 0) {
      setProductFormError('Please enter a valid price greater than 0.')
      return
    }
    if (editingProduct.pricingType === 'options' && validOptions.length === 0) {
      setProductFormError('Add at least one size option with a name and price greater than 0.')
      return
    }

    const product: BakeryProduct = {
      ...editingProduct,
      id: editingProduct.id || makeId(),
      name: editingProduct.name.trim(),
      description: editingProduct.description.trim(),
      options: validOptions,
      basePrice: editingProduct.pricingType === 'single' ? Number(editingProduct.basePrice) : 0,
      updatedAt: new Date().toISOString(),
    }

    setSavingProduct(true)
    try {
      await saveProduct(product)

      const previousImage = originalProductImageRef.current
      uncommittedProductImageRef.current = null
      originalProductImageRef.current = ''

      // Clean up the replaced/removed old image from Supabase Storage if unused.
      if (previousImage && previousImage !== product.imageUrl) {
        const stillReferenced = data.products.some(
          (item) => item.id !== product.id && item.imageUrl === previousImage
        )
        const supabase = getSupabaseBrowserClient()
        if (supabase && !stillReferenced) {
          await deleteCatalogueImageByUrl(supabase, previousImage)
        }
      }

      setEditingProduct(null)
      setFeedback(`“${product.name}” has been saved to the live catalogue.`)
    } catch (reason) {
      setProductFormError(
        reason instanceof Error ? reason.message : 'Unable to save product. Please try again.'
      )
    } finally {
      setSavingProduct(false)
    }
  }

  async function handleToggleProductPublished(product: BakeryProduct) {
    setBusyId(product.id)
    setActionError('')
    setFeedback('')
    try {
      await saveProduct({
        ...product,
        published: !product.published,
        updatedAt: new Date().toISOString(),
      })
      setFeedback(
        `${product.name} is now ${product.published ? 'hidden from' : 'published on'} the live menu.`
      )
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : 'Unable to update product visibility.'
      )
    } finally {
      setBusyId(null)
    }
  }

  async function handleDeleteProduct(product: BakeryProduct) {
    if (!window.confirm(`Are you sure you want to permanently delete “${product.name}”?`)) {
      return
    }
    setBusyId(product.id)
    setActionError('')
    setFeedback('')
    try {
      await deleteProduct(product.id)
      setFeedback(`“${product.name}” was permanently deleted.`)
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Unable to delete product.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleCategorySave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!categoryName.trim() || savingCategory) return

    setSavingCategory(true)
    setActionError('')
    setFeedback('')
    try {
      await saveCategory({
        id: editingCategory?.id ?? makeId(),
        name: categoryName.trim(),
        description: categoryDescription.trim(),
        published: editingCategory?.published ?? true,
        createdAt: editingCategory?.createdAt ?? new Date().toISOString(),
      })
      setEditingCategory(null)
      setCategoryName('')
      setCategoryDescription('')
      setFeedback('Category saved to the live catalogue.')
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Unable to save category.')
    } finally {
      setSavingCategory(false)
    }
  }

  async function handleToggleCategoryPublished(category: BakeryCategory) {
    setBusyId(category.id)
    setActionError('')
    setFeedback('')
    try {
      await saveCategory({ ...category, published: !category.published })
      setFeedback(
        `Category “${category.name}” is now ${category.published ? 'hidden' : 'visible'}.`
      )
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Unable to update category.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDeleteCategory(category: BakeryCategory) {
    if (
      !window.confirm(
        `Delete the “${category.name}” category? Products in it will move to Other.`
      )
    ) {
      return
    }

    const fallbackId =
      data.categories.find((item) => item.id === 'other' && item.id !== category.id)?.id ?? null

    setBusyId(category.id)
    setActionError('')
    setFeedback('')
    try {
      await deleteCategory(category.id, fallbackId)
      setFeedback(
        fallbackId
          ? 'Category deleted. Its products were moved to Other.'
          : 'Category deleted.'
      )
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Unable to delete category.')
    } finally {
      setBusyId(null)
    }
  }

  async function uploadSettingsLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setActionError('Supabase Storage is not configured.')
      return
    }

    setUploadingLogo(true)
    setActionError('')
    try {
      const { publicUrl } = await uploadCatalogueImage(supabase, file, 'branding')
      await cleanupUncommittedImage(uncommittedLogoRef)
      uncommittedLogoRef.current = publicUrl
      setSettingsDraft((current) => ({ ...current, logoUrl: publicUrl }))
      setFeedback('New logo uploaded. Click “Save business details” to apply it.')
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Unable to upload the logo.')
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingSettings) return

    setSavingSettings(true)
    setActionError('')
    setFeedback('')

    const previousLogo = data.settings.logoUrl
    try {
      await saveSettings(settingsDraft)
      uncommittedLogoRef.current = null

      if (previousLogo && previousLogo !== settingsDraft.logoUrl) {
        const supabase = getSupabaseBrowserClient()
        if (supabase) {
          await deleteCatalogueImageByUrl(supabase, previousLogo)
        }
      }
      setFeedback('Business details saved to the live storefront.')
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : 'Unable to save business details.'
      )
    } finally {
      setSavingSettings(false)
    }
  }

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    setActionError('')
    try {
      await cleanupUncommittedImage(uncommittedProductImageRef)
      await cleanupUncommittedImage(uncommittedLogoRef)

      const supabase = getSupabaseBrowserClient()
      if (supabase) {
        await supabase.auth.signOut()
      }
      // Clear any leftover browser storage tokens if present.
      try {
        Object.keys(window.localStorage)
          .filter((key) => key.startsWith('sb-') || key.startsWith('am-cakery-'))
          .forEach((key) => window.localStorage.removeItem(key))
      } catch {
        // Ignore storage access errors in restricted environments.
      }
      router.replace('/admin/login')
      router.refresh()
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Unable to sign out.')
      setSigningOut(false)
    }
  }

  function setSection(nextSection: Section) {
    if (editingProduct) {
      closeProductEditor()
    }
    setSectionState(nextSection)
    setFeedback('')
    setActionError('')
  }

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/">
          <Image
            src={data.settings.logoUrl || '/am-cakery-logo.png'}
            alt="AM CAKERY logo"
            width={47}
            height={47}
            unoptimized
          />
          <span>
            <strong>AM CAKERY</strong>
            <small>BUSINESS DASHBOARD</small>
          </span>
        </Link>

        <nav className="admin-nav" aria-label="Dashboard sections">
          {(
            [
              ['overview', LayoutDashboard, 'Overview'],
              ['products', Package, 'Catalogue'],
              ['categories', Tag, 'Categories'],
              ['settings', Settings2, 'Business settings'],
            ] as const
          ).map(([key, Icon, label]) => (
            <button
              type="button"
              key={key}
              className={section === key ? 'admin-nav-link current' : 'admin-nav-link'}
              onClick={() => setSection(key)}
            >
              <Icon size={17} strokeWidth={1.7} />
              {label}
              {section === key && <ChevronRight size={15} className="nav-chevron" />}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-session-card">
            <UserCheck size={16} />
            <span>
              Signed in as
              <strong title={adminEmail}>{adminEmail}</strong>
            </span>
          </div>
          <Link href="/" className="admin-back-link">
            <ArrowLeft size={15} /> View public catalogue
          </Link>
          <button
            type="button"
            className="admin-sidebar-signout"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? <Loader2 size={15} className="spin" /> : <LogOut size={15} />}
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
          <span className="admin-version">AM CAKERY · OWNER AREA</span>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-breadcrumb">
            <span>AM CAKERY</span>
            <ChevronRight size={14} />
            <strong>
              {section === 'overview'
                ? 'Overview'
                : section === 'products'
                  ? 'Catalogue management'
                  : section === 'categories'
                    ? 'Category management'
                    : 'Business settings'}
            </strong>
          </div>
          <div className="admin-top-actions">
            <span className="cloud-badge">
              <span /> Live catalogue
            </span>
            <button
              type="button"
              className="admin-signout"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? <Loader2 size={15} className="spin" /> : <LogOut size={15} />}
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </header>

        <div className="admin-content">
          <div className="admin-welcome">
            <div>
              <span className="eyebrow">A WARM WELCOME BACK</span>
              <h1>
                {section === 'overview'
                  ? 'Your little business, at a glance.'
                  : section === 'products'
                    ? 'Your catalogue, your way.'
                    : section === 'categories'
                      ? 'A place for every favourite.'
                      : 'The details that make you, you.'}
              </h1>
              <p>
                {section === 'overview'
                  ? 'Manage the treats, categories, and business details shown on your live storefront.'
                  : 'All changes sync immediately to your live Supabase catalogue for every visitor.'}
              </p>
            </div>
            {section === 'products' && (
              <button
                className="button button-dark"
                type="button"
                onClick={() => openProductEditor(emptyProduct(data.categories[0]?.id ?? ''))}
              >
                <Plus size={16} /> Add a product
              </button>
            )}
          </div>

          {storeError && (
            <div className="admin-error" role="alert">
              <AlertCircle size={16} />
              <span>{storeError}</span>
              <button type="button" className="text-button" onClick={() => void refresh()}>
                <RefreshCw size={13} /> Retry
              </button>
            </div>
          )}

          {actionError && (
            <p className="admin-error" role="alert">
              <AlertCircle size={16} />
              <span>{actionError}</span>
              <button
                type="button"
                aria-label="Dismiss error"
                onClick={() => setActionError('')}
              >
                <X size={14} />
              </button>
            </p>
          )}

          {feedback && (
            <p className="admin-feedback" role="status">
              <Check size={16} />
              {feedback}
              <button
                type="button"
                aria-label="Dismiss message"
                onClick={() => setFeedback('')}
              >
                <X size={14} />
              </button>
            </p>
          )}

          {loading && !ready && (
            <div className="admin-loading">
              <Loader2 size={16} className="spin" /> Loading your live catalogue…
            </div>
          )}

          {section === 'overview' && (
            <>
              <div className="stats-grid">
                <article className="stat-card">
                  <span>Total products</span>
                  <strong>{counts.products}</strong>
                  <small>
                    <Package size={14} /> In your catalogue
                  </small>
                </article>
                <article className="stat-card">
                  <span>Published</span>
                  <strong>{counts.published}</strong>
                  <small>
                    <span className="status-dot published-dot" /> Visible to customers
                  </small>
                </article>
                <article className="stat-card">
                  <span>Hidden</span>
                  <strong>{counts.hidden}</strong>
                  <small>
                    <span className="status-dot hidden-dot" /> Not shown on the menu
                  </small>
                </article>
                <article className="stat-card">
                  <span>Categories</span>
                  <strong>{counts.categories}</strong>
                  <small>
                    <FolderOpen size={14} /> Your collections
                  </small>
                </article>
              </div>

              <div className="admin-panel overview-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">YOUR RECENT TREATS</span>
                    <h2>Catalogue at a glance</h2>
                  </div>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => setSection('products')}
                  >
                    Manage catalogue <ArrowLeft size={14} className="arrow-turn" />
                  </button>
                </div>
                <div className="overview-list">
                  {data.products.slice(0, 5).map((product) => {
                    const price = getDisplayPrice(product)
                    return (
                      <div className="overview-product" key={product.id}>
                        <div className="overview-thumb">
                          {product.imageUrl && (
                            <Image src={product.imageUrl} alt="" fill sizes="48px" unoptimized />
                          )}
                        </div>
                        <strong>{product.name}</strong>
                        <span>
                          {price.from ? 'From ' : ''}
                          {formatTzs(price.amount)}
                        </span>
                        <span
                          className={`table-status ${product.published ? 'status-live' : 'status-hidden'}`}
                        >
                          <i />
                          {product.published ? 'Published' : 'Hidden'}
                        </span>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => {
                            setSection('products')
                            openProductEditor(product)
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    )
                  })}
                  {ready && data.products.length === 0 && (
                    <div className="admin-empty">
                      <Package size={24} />
                      <h3>No products yet</h3>
                      <p>Add your first treat to publish it on the storefront.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="dashboard-shortcuts">
                <button type="button" onClick={() => setSection('products')}>
                  <Package size={18} />
                  <span>
                    <strong>Add or update a product</strong>
                    <small>Change names, photos, sizes and pricing</small>
                  </span>
                  <ChevronRight size={17} />
                </button>
                <button type="button" onClick={() => setSection('settings')}>
                  <Settings2 size={18} />
                  <span>
                    <strong>Update your business details</strong>
                    <small>Keep your location and contact current</small>
                  </span>
                  <ChevronRight size={17} />
                </button>
              </div>
            </>
          )}

          {section === 'products' && (
            <div className="admin-panel catalogue-panel">
              <div className="catalogue-panel-heading">
                <div>
                  <span className="eyebrow">PRODUCTS &amp; PRICING</span>
                  <h2>Catalogue management</h2>
                </div>
                <label className="admin-search">
                  <span className="sr-only">Search catalogue</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Find a product…"
                  />
                </label>
              </div>
              <div className="admin-product-list">
                {filteredProducts.map((product) => {
                  const price = getDisplayPrice(product)
                  const isBusy = busyId === product.id
                  return (
                    <article className="admin-product-row" key={product.id}>
                      <div className="admin-product-photo">
                        {product.imageUrl && (
                          <Image src={product.imageUrl} alt="" fill sizes="72px" unoptimized />
                        )}
                      </div>
                      <div className="admin-product-info">
                        <h3>{product.name}</h3>
                        <p>
                          {data.categories.find((category) => category.id === product.categoryId)
                            ?.name ?? 'No category'}{' '}
                          ·{' '}
                          {product.pricingType === 'options'
                            ? `${product.options.length} options`
                            : 'Single price'}
                        </p>
                        <strong>
                          {price.from ? 'From ' : ''}
                          {formatTzs(price.amount)}
                        </strong>
                      </div>
                      <div className="admin-product-actions">
                        <span
                          className={`table-status ${product.published ? 'status-live' : 'status-hidden'}`}
                        >
                          <i />
                          {product.published ? 'Published' : 'Hidden'}
                        </span>
                        <button
                          type="button"
                          className="button button-outline admin-edit-button"
                          onClick={() => openProductEditor(product)}
                          disabled={isBusy}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-button"
                          disabled={isBusy}
                          onClick={() => void handleToggleProductPublished(product)}
                        >
                          {isBusy ? 'Saving…' : product.published ? 'Hide' : 'Publish'}
                        </button>
                        <button
                          type="button"
                          className="icon-button delete-icon"
                          aria-label={`Delete ${product.name}`}
                          disabled={isBusy}
                          onClick={() => void handleDeleteProduct(product)}
                        >
                          {isBusy ? <Loader2 size={15} className="spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </article>
                  )
                })}
                {ready && filteredProducts.length === 0 && (
                  <div className="admin-empty">
                    <Package size={27} />
                    <h3>No products found</h3>
                    <p>Try another name, or add a new treat to your catalogue.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {section === 'categories' && (
            <div className="admin-panel category-panel">
              <div className="catalogue-panel-heading">
                <div>
                  <span className="eyebrow">MENU COLLECTIONS</span>
                  <h2>Category management</h2>
                  <p>Create, hide or rename the collections customers browse.</p>
                </div>
                <button
                  type="button"
                  className="button button-dark"
                  onClick={() => {
                    setEditingCategory(null)
                    setCategoryName('')
                    setCategoryDescription('')
                  }}
                >
                  <Plus size={15} /> Add category
                </button>
              </div>
              <form className="category-create-form" onSubmit={handleCategorySave}>
                <label>
                  {editingCategory ? 'Rename category' : 'New category name'}
                  <input
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                    placeholder="e.g. Cupcakes"
                    required
                    disabled={savingCategory}
                  />
                </label>
                <label>
                  Description <span>Optional</span>
                  <input
                    value={categoryDescription}
                    onChange={(event) => setCategoryDescription(event.target.value)}
                    placeholder="A short note for this collection"
                    disabled={savingCategory}
                  />
                </label>
                <div className="category-form-actions">
                  {editingCategory && (
                    <button
                      type="button"
                      className="button button-outline"
                      disabled={savingCategory}
                      onClick={() => {
                        setEditingCategory(null)
                        setCategoryName('')
                        setCategoryDescription('')
                      }}
                    >
                      Cancel
                    </button>
                  )}
                  <button className="button button-dark" type="submit" disabled={savingCategory}>
                    {savingCategory ? (
                      <Loader2 size={15} className="spin" />
                    ) : (
                      <Save size={15} />
                    )}
                    {savingCategory
                      ? 'Saving…'
                      : editingCategory
                        ? 'Save changes'
                        : 'Create category'}
                  </button>
                </div>
              </form>
              <div className="category-list">
                {data.categories.map((category) => {
                  const isBusy = busyId === category.id
                  return (
                    <article className="category-row" key={category.id}>
                      <div className="category-icon">
                        <Tag size={17} />
                      </div>
                      <div className="category-info">
                        <strong>{category.name}</strong>
                        <span>
                          {data.products.filter((product) => product.categoryId === category.id).length}{' '}
                          products · {category.description || 'No description'}
                        </span>
                      </div>
                      <span
                        className={`table-status ${category.published ? 'status-live' : 'status-hidden'}`}
                      >
                        <i />
                        {category.published ? 'Visible' : 'Hidden'}
                      </span>
                      <button
                        className="text-button"
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleToggleCategoryPublished(category)}
                      >
                        {isBusy ? 'Saving…' : category.published ? 'Hide' : 'Show'}
                      </button>
                      <button
                        className="text-button"
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setEditingCategory(category)
                          setCategoryName(category.name)
                          setCategoryDescription(category.description)
                        }}
                      >
                        Rename
                      </button>
                      <button
                        className="icon-button delete-icon"
                        type="button"
                        aria-label={`Delete ${category.name}`}
                        disabled={isBusy}
                        onClick={() => void handleDeleteCategory(category)}
                      >
                        {isBusy ? <Loader2 size={15} className="spin" /> : <Trash2 size={16} />}
                      </button>
                    </article>
                  )
                })}
              </div>
            </div>
          )}

          {section === 'settings' && (
            <form className="admin-panel settings-panel" onSubmit={handleSettingsSubmit}>
              <div className="catalogue-panel-heading">
                <div>
                  <span className="eyebrow">THE DETAILS CUSTOMERS SEE</span>
                  <h2>Business settings</h2>
                  <p>These details appear on the live public catalogue and WhatsApp orders.</p>
                </div>
              </div>
              <div className="settings-form-grid">
                <label>
                  Business name
                  <input
                    value={settingsDraft.businessName}
                    onChange={(event) =>
                      setSettingsDraft({ ...settingsDraft, businessName: event.target.value })
                    }
                    required
                    disabled={savingSettings}
                  />
                </label>
                <label>
                  WhatsApp number
                  <input
                    type="tel"
                    value={settingsDraft.whatsapp}
                    onChange={(event) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        whatsapp: event.target.value.replace(/\D/g, ''),
                      })
                    }
                    required
                    disabled={savingSettings}
                  />
                  <small>Include country code, numbers only. Example: 255786169647</small>
                </label>
                <label>
                  Location
                  <input
                    value={settingsDraft.location}
                    onChange={(event) =>
                      setSettingsDraft({ ...settingsDraft, location: event.target.value })
                    }
                    disabled={savingSettings}
                  />
                </label>
                <label>
                  Tagline
                  <input
                    value={settingsDraft.tagline}
                    onChange={(event) =>
                      setSettingsDraft({ ...settingsDraft, tagline: event.target.value })
                    }
                    disabled={savingSettings}
                  />
                </label>
                <label className="settings-wide">
                  Business description
                  <textarea
                    rows={4}
                    value={settingsDraft.description}
                    onChange={(event) =>
                      setSettingsDraft({ ...settingsDraft, description: event.target.value })
                    }
                    disabled={savingSettings}
                  />
                </label>
                <div className="settings-wide settings-logo-field">
                  <span className="form-label">Business logo</span>
                  <div className="settings-logo-preview">
                    <Image
                      src={settingsDraft.logoUrl || '/am-cakery-logo.png'}
                      alt="Business logo preview"
                      width={96}
                      height={96}
                      unoptimized
                    />
                    <label
                      className={`button button-outline upload-button ${uploadingLogo || savingSettings ? 'upload-disabled' : ''}`}
                    >
                      {uploadingLogo ? (
                        <>
                          <Loader2 size={15} className="spin" /> Uploading logo…
                        </>
                      ) : (
                        <>
                          <Camera size={15} /> Replace logo
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={uploadSettingsLogo}
                        disabled={uploadingLogo || savingSettings}
                      />
                    </label>
                  </div>
                  <small>Uploaded logos are hosted publicly in Supabase Storage.</small>
                </div>
              </div>
              <button
                className="button button-dark settings-save"
                type="submit"
                disabled={savingSettings || uploadingLogo}
              >
                {savingSettings ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
                {savingSettings ? 'Saving…' : 'Save business details'}
              </button>
            </form>
          )}
        </div>
      </div>

      {editingProduct && (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeProductEditor()
          }}
        >
          <section
            className="product-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-product-title"
          >
            <header className="modal-heading">
              <div>
                <span className="eyebrow">YOUR MENU, YOUR WAY</span>
                <h2 id="edit-product-title">
                  {editingProduct.id ? 'Edit product' : 'Add a new product'}
                </h2>
                <p>Saved changes appear immediately on the live storefront.</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={closeProductEditor}
                aria-label="Close product editor"
                disabled={savingProduct}
              >
                <X />
              </button>
            </header>

            <form className="product-edit-form" onSubmit={submitProduct}>
              <ImagePicker
                label="Product photo"
                value={editingProduct.imageUrl}
                onUploaded={handleProductImageUploaded}
                onRemove={handleProductImageRemoved}
                disabled={savingProduct}
              />
              <label>
                Product name
                <input
                  value={editingProduct.name}
                  onChange={(event) =>
                    setEditingProduct({ ...editingProduct, name: event.target.value })
                  }
                  placeholder="e.g. Red velvet cake"
                  required
                  disabled={savingProduct}
                />
              </label>
              <label>
                Category
                <select
                  value={editingProduct.categoryId}
                  onChange={(event) =>
                    setEditingProduct({ ...editingProduct, categoryId: event.target.value })
                  }
                  required
                  disabled={savingProduct}
                >
                  {data.categories.length === 0 && <option value="">No categories available</option>}
                  {data.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Description
                <textarea
                  rows={3}
                  value={editingProduct.description}
                  onChange={(event) =>
                    setEditingProduct({ ...editingProduct, description: event.target.value })
                  }
                  placeholder="A little description for your customers"
                  disabled={savingProduct}
                />
              </label>
              <fieldset className="pricing-choice" disabled={savingProduct}>
                <legend>How is this item priced?</legend>
                <label>
                  <input
                    type="radio"
                    checked={editingProduct.pricingType === 'single'}
                    onChange={() =>
                      setEditingProduct({ ...editingProduct, pricingType: 'single' })
                    }
                  />{' '}
                  Single price
                </label>
                <label>
                  <input
                    type="radio"
                    checked={editingProduct.pricingType === 'options'}
                    onChange={() =>
                      setEditingProduct({ ...editingProduct, pricingType: 'options' })
                    }
                  />{' '}
                  Multiple options
                </label>
              </fieldset>
              {editingProduct.pricingType === 'single' ? (
                <label>
                  Price (TZS)
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editingProduct.basePrice || ''}
                    onChange={(event) =>
                      setEditingProduct({
                        ...editingProduct,
                        basePrice: Number(event.target.value),
                      })
                    }
                    placeholder="1000"
                    required
                    disabled={savingProduct}
                  />
                </label>
              ) : (
                <div className="options-editor">
                  <div className="options-editor-heading">
                    <div>
                      <strong>Size &amp; price options</strong>
                      <span>Add one or more choices for customers.</span>
                    </div>
                    <button
                      className="button button-outline"
                      type="button"
                      onClick={addOption}
                      disabled={savingProduct}
                    >
                      <Plus size={14} /> Add option
                    </button>
                  </div>
                  {editingProduct.options.map((option) => (
                    <div className="option-edit-row" key={option.id}>
                      <label>
                        Option name
                        <input
                          value={option.name}
                          onChange={(event) => updateOption(option.id, 'name', event.target.value)}
                          placeholder="e.g. 1 kg"
                          required
                          disabled={savingProduct}
                        />
                      </label>
                      <label>
                        Price (TZS)
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={option.price || ''}
                          onChange={(event) => updateOption(option.id, 'price', event.target.value)}
                          placeholder="35000"
                          required
                          disabled={savingProduct}
                        />
                      </label>
                      <button
                        type="button"
                        className="icon-button delete-icon"
                        aria-label={`Remove ${option.name || 'option'}`}
                        disabled={savingProduct}
                        onClick={() =>
                          setEditingProduct({
                            ...editingProduct,
                            options: editingProduct.options.filter((item) => item.id !== option.id),
                          })
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="edit-product-toggles">
                <label>
                  <input
                    type="checkbox"
                    checked={editingProduct.available}
                    disabled={savingProduct}
                    onChange={(event) =>
                      setEditingProduct({ ...editingProduct, available: event.target.checked })
                    }
                  />{' '}
                  Available to order
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={editingProduct.published}
                    disabled={savingProduct}
                    onChange={(event) =>
                      setEditingProduct({ ...editingProduct, published: event.target.checked })
                    }
                  />{' '}
                  Show in public menu
                </label>
              </div>

              {productFormError && (
                <p className="form-error" role="alert">
                  {productFormError}
                </p>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-outline"
                  onClick={closeProductEditor}
                  disabled={savingProduct}
                >
                  Cancel
                </button>
                <button type="submit" className="button button-dark" disabled={savingProduct}>
                  {savingProduct ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
                  {savingProduct ? 'Saving…' : 'Save product'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
