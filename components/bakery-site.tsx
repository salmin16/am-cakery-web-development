'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowRight, CakeSlice, Check, ChevronDown, Heart, MapPin, Menu as MenuIcon, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { formatTzs, makeId, type CartLine, type BakeryProduct } from '@/lib/bakery-data'
import { useBakeryStore } from '@/components/bakery-store'

type ProductImageProps = { src: string; alt: string; className?: string }
function ProductImage({ src, alt, className = '' }: ProductImageProps) {
  return <Image src={src || '/placeholder.jpg'} alt={alt} fill sizes="(max-width: 700px) 90vw, (max-width: 1100px) 45vw, 30vw" className={className} unoptimized={src.startsWith('data:')} />
}

function makeWhatsAppLink(phone: string, message: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
}

function openWhatsApp(phone: string, message: string) {
  const popup = window.open(makeWhatsAppLink(phone, message), '_blank')
  if (!popup) return false
  popup.opener = null
  return true
}

function ProductCard({ product, categoryName, onAdd, onOpenOrder }: { product: BakeryProduct; categoryName: string; onAdd: (product: BakeryProduct, optionId?: string | null, quantity?: number) => void; onOpenOrder: () => void }) {
  const [optionId, setOptionId] = useState(product.options[0]?.id ?? '')
  const [quantity, setQuantity] = useState(1)
  const selectedOption = product.options.find((option) => option.id === optionId)

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <ProductImage src={product.imageUrl} alt={product.name} className="product-image" />
        <span className={`product-availability ${product.available ? '' : 'unavailable'}`}>{product.available ? 'Made fresh to order' : 'Currently unavailable'}</span>
      </div>
      <div className="product-card-body">
        <div className="product-title-row">
          <div><span className="eyebrow product-category">{categoryName}</span><h3>{product.name}</h3></div>
          <span className="price-label">{product.pricingType === 'options' ? 'From ' : ''}{formatTzs(product.pricingType === 'options' ? Math.min(...product.options.map((option) => option.price)) : product.basePrice)}</span>
        </div>
        <p className="product-description">{product.description}</p>
        {product.pricingType === 'options' && (
          <label className="option-select-label">Choose your size
            <span className="select-wrap"><select value={optionId} onChange={(event) => setOptionId(event.target.value)} disabled={!product.available} aria-label={`Choose ${product.name} size`}>
              {product.options.map((option) => <option value={option.id} key={option.id}>{option.name} — {formatTzs(option.price)}</option>)}
            </select><ChevronDown size={16} aria-hidden="true" /></span>
          </label>
        )}
        <div className="product-actions">
          <div className="quantity-stepper" aria-label={`Quantity for ${product.name}`}>
            <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus size={15} /></button>
            <span>{quantity}</span>
            <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((value) => Math.min(99, value + 1))}><Plus size={15} /></button>
          </div>
          <button className="button button-dark product-add-button" type="button" disabled={!product.available || (product.pricingType === 'options' && !selectedOption)} onClick={() => { onAdd(product, optionId || null, quantity); onOpenOrder() }}>
            Add to order <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </article>
  )
}

export function BakerySite() {
  const { data } = useBakeryStore()
  const [categoryId, setCategoryId] = useState('all')
  const [cart, setCart] = useState<CartLine[]>([])
  const [orderOpen, setOrderOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [orderError, setOrderError] = useState('')
  const [customError, setCustomError] = useState('')
  const [customName, setCustomName] = useState('')
  const [customOccasion, setCustomOccasion] = useState('')
  const [customDate, setCustomDate] = useState('')

  const visibleCategories = data.categories.filter((category) => category.published)
  const products = data.products.filter((product) => product.published && data.categories.some((category) => category.id === product.categoryId && category.published))
  const filteredProducts = categoryId === 'all' ? products : products.filter((product) => product.categoryId === categoryId)
  const lines = useMemo(() => cart.map((line) => {
    const product = data.products.find((item) => item.id === line.productId)
    const option = product?.options.find((item) => item.id === line.optionId)
    return product ? { ...line, product, option, unitPrice: product.pricingType === 'options' ? option?.price ?? 0 : product.basePrice, subtotal: (product.pricingType === 'options' ? option?.price ?? 0 : product.basePrice) * line.quantity } : null
  }).filter((line): line is NonNullable<typeof line> => line !== null), [cart, data.products])
  const total = lines.reduce((sum, line) => sum + line.subtotal, 0)
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0)
  const today = new Date().toISOString().slice(0, 10)

  function addProduct(product: BakeryProduct, optionId?: string | null, count = 1) {
    if (!product.available) return
    const key = `${product.id}:${optionId ?? 'single'}`
    setCart((current) => {
      const existing = current.find((line) => line.key === key)
      return existing ? current.map((line) => line.key === key ? { ...line, quantity: Math.min(99, line.quantity + count) } : line) : [...current, { key, productId: product.id, optionId: optionId ?? null, quantity: count }]
    })
  }

  function changeQuantity(key: string, delta: number) {
    setCart((current) => current.map((line) => line.key === key ? { ...line, quantity: line.quantity + delta } : line).filter((line) => line.quantity > 0))
  }

  function sendOrder() {
    if (!lines.length) { setOrderError('Please select at least one product before continuing.'); return }
    if (!customerName.trim()) { setOrderError('Please enter your name.'); return }
    if (lines.some((line) => !line.product.available)) { setOrderError('One of your selected products is currently unavailable. Please remove it to continue.'); return }
    const reference = `AM-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`
    const message = [
      'Hello AM CAKERY,',
      'I would like to make an order.',
      `ORDER REFERENCE: ${reference}`,
      '', 'CUSTOMER DETAILS', `Name: ${customerName.trim()}`,
      customerPhone.trim() ? `Phone: ${customerPhone.trim()}` : '',
      preferredDate ? `Preferred order date: ${new Date(`${preferredDate}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : '',
      '', 'SELECTED PRODUCTS',
      ...lines.map((line) => `${line.product.name}${line.option ? ` — ${line.option.name}` : ''} × ${line.quantity}\n${formatTzs(line.unitPrice)} × ${line.quantity} = ${formatTzs(line.subtotal)}`),
      '', `ESTIMATED TOTAL: ${formatTzs(total)}`,
      '', 'I would like to confirm availability and discuss payment and pickup or delivery arrangements with you.', 'Thank you.',
    ].filter(Boolean).join('\n')
    if (!openWhatsApp(data.settings.whatsapp, message)) { setOrderError('Unable to open WhatsApp. Please contact AM CAKERY directly at +255 786 169 647.'); return }
    setOrderError('')
  }

  function sendCustomRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!customName.trim()) return
    const message = [
      'Hello AM CAKERY,', 'I would like to enquire about a custom cake.',
      `My name is: ${customName.trim()}`,
      customOccasion.trim() ? `Event/occasion: ${customOccasion.trim()}` : '',
      customDate ? `Preferred date: ${new Date(`${customDate}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : '',
      'I would like to discuss the cake design, flavour, size, decorations and pricing with you.', 'Thank you.',
    ].filter(Boolean).join('\n')
    if (!openWhatsApp(data.settings.whatsapp, message)) setCustomError('Unable to open WhatsApp. Please contact AM CAKERY directly at +255 786 169 647.')
    else setCustomError('')
  }

  return (
    <main>
      <div className="announcement"><span>Made with care in Dar es Salaam</span><span className="announcement-dot">·</span><a href="#contact">Ubungo Riverside <MapPin size={13} /></a></div>
      <header className="site-header">
        <a href="#home" className="brand-lockup" aria-label="AM CAKERY home"><Image src={data.settings.logoUrl} alt="AM CAKERY — elegant circular cake and floral logo" width={56} height={56} className="brand-logo" unoptimized={data.settings.logoUrl.startsWith('data:')} /><span className="brand-wordmark"><strong>{data.settings.businessName}</strong><small>{data.settings.tagline}</small></span></a>
        <nav className={`main-navigation ${mobileMenuOpen ? 'navigation-open' : ''}`} aria-label="Main navigation">
          <a href="#home" onClick={() => setMobileMenuOpen(false)}>Home</a><a href="#menu" onClick={() => setMobileMenuOpen(false)}>Menu</a><a href="#custom-cake" onClick={() => setMobileMenuOpen(false)}>Custom cake</a><a href="#about" onClick={() => setMobileMenuOpen(false)}>About</a><a href="#contact" onClick={() => setMobileMenuOpen(false)}>Contact</a>
        </nav>
        <div className="header-actions"><button className="header-order" type="button" onClick={() => setOrderOpen(true)} aria-label={`Open order, ${itemCount} items`}><ShoppingBag size={19} strokeWidth={1.6} /><span className="cart-count">{itemCount}</span><span className="header-order-label">Your order</span></button><button className="mobile-menu-toggle" type="button" aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}>{mobileMenuOpen ? <X /> : <MenuIcon />}</button></div>
      </header>

      <section className="hero" id="home">
        <div className="hero-content"><span className="eyebrow"><span className="eyebrow-line" /> A LITTLE SOMETHING LOVELY</span><h1>Freshly baked.<br /><em>Beautifully made.</em></h1><p>Thoughtful cakes and oven-fresh treats for the moments that deserve something special.</p><div className="hero-actions"><a href="#menu" className="button button-dark">Explore the menu <ArrowRight size={16} /></a><a href="#custom-cake" className="text-link">Dreaming of a custom cake? <ArrowDown size={14} /></a></div><div className="hero-location"><MapPin size={16} strokeWidth={1.5} /><span>{data.settings.location}</span></div></div>
        <div className="hero-image-frame"><Image src="/bakery-hero.png" alt="An elegant ivory celebration cake with delicate flowers, made for a special occasion" fill priority sizes="(max-width: 760px) 100vw, 52vw" className="hero-image" /><div className="hero-image-note"><span className="note-flower">✳</span><span>Small-batch<br />& made with love</span></div><div className="hero-image-caption">A sweet way to celebrate</div></div>
        <div className="hero-scroll"><span>SCROLL TO DISCOVER</span><span className="scroll-line" /></div>
      </section>

      <section className="menu-section section-shell" id="menu"><div className="section-heading"><div><span className="eyebrow">A FRESH BATCH, JUST FOR YOU</span><h2>A taste of <em>something lovely.</em></h2></div><p>Freshly baked favourites, made for everyday little joys and the days you will always remember.</p></div>
        <div className="menu-toolbar"><div className="category-filters" role="group" aria-label="Filter menu by category"><button className={categoryId === 'all' ? 'filter-chip active' : 'filter-chip'} onClick={() => setCategoryId('all')} type="button">Everything</button>{visibleCategories.map((category) => <button className={categoryId === category.id ? 'filter-chip active' : 'filter-chip'} key={category.id} onClick={() => setCategoryId(category.id)} type="button">{category.name}</button>)}</div><span className="menu-count">{filteredProducts.length} {filteredProducts.length === 1 ? 'favourite' : 'favourites'}</span></div>
        {filteredProducts.length ? <div className="product-grid">{filteredProducts.map((product) => <ProductCard product={product} categoryName={visibleCategories.find((category) => category.id === product.categoryId)?.name ?? 'Other'} key={product.id} onAdd={addProduct} onOpenOrder={() => setOrderOpen(true)} />)}</div> : <div className="empty-menu"><CakeSlice size={28} strokeWidth={1.2} /><h3>A fresh batch is on its way.</h3><p>There are no treats in this collection right now. Please explore another category.</p><button className="text-link" type="button" onClick={() => setCategoryId('all')}>View everything <ArrowRight size={14} /></button></div>}
        <p className="menu-note">All prices are estimates. We will confirm availability and final details with you on WhatsApp.</p>
      </section>

      <section className="custom-section" id="custom-cake"><div className="custom-copy"><span className="eyebrow">MADE FOR YOUR MOMENT</span><h2>Have a special<br /><em>cake in mind?</em></h2><p>Tell us about your event, design and preferences. We would love to dream up something lovely with you. Custom cakes are quoted personally, so there is no automatic price.</p><a className="button button-cream" href="#custom-request">Let&apos;s dream it up <ArrowRight size={16} /></a></div><div className="custom-photo"><Image src="/vanilla-cake.png" alt="A delicately decorated ivory cake for a custom celebration" fill sizes="(max-width: 760px) 100vw, 45vw" className="custom-image" /><span className="custom-photo-caption">Your day, your way.</span></div></section>

      <section className="custom-form-section" id="custom-request"><div className="custom-form-intro"><span className="eyebrow">A NOTE TO OUR CAKE MAKER</span><h2>Tell us a little<br /><em>about your day.</em></h2><p>Share a name and, if you know them, the occasion and your preferred date. We will take it from there together.</p></div><form className="custom-form" onSubmit={sendCustomRequest}><label>Your name <span>Required</span><input required value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="How should we greet you?" /></label><label>Event or occasion <span>Optional</span><input value={customOccasion} onChange={(event) => setCustomOccasion(event.target.value)} placeholder="A birthday, a wedding, just because…" /></label><label>Preferred date <span>Optional</span><input type="date" min={today} value={customDate} onChange={(event) => setCustomDate(event.target.value)} /></label>{customError && <p className="form-error" role="alert">{customError}</p>}<button type="submit" className="button button-dark">Request a custom cake <ArrowRight size={16} /></button><small>No price is set here. We will discuss the details with you on WhatsApp.</small></form></section>

      <section className="about-section section-shell" id="about"><div className="about-mark"><Image src={data.settings.logoUrl} alt="AM CAKERY circular cake logo" width={172} height={172} unoptimized={data.settings.logoUrl.startsWith('data:')} /></div><div className="about-copy"><span className="eyebrow">A LITTLE ABOUT OUR KITCHEN</span><h2>Made with care,<br /><em>shared with love.</em></h2><p>{data.settings.description}</p><div className="about-signature"><span>AM CAKERY</span><span className="signature-rule" /><Heart size={14} fill="currentColor" strokeWidth={1} /></div></div></section>

      <section className="contact-section" id="contact"><span className="eyebrow">WE WOULD LOVE TO HEAR FROM YOU</span><h2>Let&apos;s make<br /><em>something sweet.</em></h2><p>Questions, a special request, or just want to say hello? Our WhatsApp is always open.</p><a className="button button-cream" href={makeWhatsAppLink(data.settings.whatsapp, 'Hello AM CAKERY, I would love to ask you a question.')} target="_blank" rel="noreferrer">Chat with us on WhatsApp <ArrowRight size={16} /></a><div className="contact-details"><span><MapPin size={15} />{data.settings.location}</span><a href={makeWhatsAppLink(data.settings.whatsapp, 'Hello AM CAKERY!')} target="_blank" rel="noreferrer">+{data.settings.whatsapp.replace(/\D/g, '')}</a></div></section>

      <footer className="site-footer"><a href="#home" className="footer-brand">{data.settings.businessName}</a><span>{data.settings.tagline}</span><div><a href="#menu">Menu</a><Link href="/admin">Owner&apos;s corner</Link></div><small>© {new Date().getFullYear()} AM CAKERY · Ubungo Riverside, Dar es Salaam</small></footer>

      {itemCount > 0 && !orderOpen && <button className="mobile-cart-bar" type="button" onClick={() => setOrderOpen(true)}><span className="mobile-cart-icon"><ShoppingBag size={18} /><span>{itemCount}</span></span><span>View your order</span><strong>{formatTzs(total)}</strong><ArrowRight size={17} /></button>}

      {orderOpen && <div className="order-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOrderOpen(false) }}><section className="order-drawer" role="dialog" aria-modal="true" aria-labelledby="order-title"><div className="order-drawer-header"><div><span className="eyebrow">YOUR LITTLE SELECTION</span><h2 id="order-title">Your order <span>({itemCount})</span></h2></div><button className="icon-button" type="button" onClick={() => setOrderOpen(false)} aria-label="Close order"><X /></button></div>
        {lines.length ? <><div className="order-lines">{lines.map((line) => <article className="order-line" key={line.key}><div className="order-line-image"><ProductImage src={line.product.imageUrl} alt={line.product.name} /></div><div className="order-line-content"><div className="order-line-title"><strong>{line.product.name}</strong><button type="button" aria-label={`Remove ${line.product.name}`} onClick={() => setCart((current) => current.filter((item) => item.key !== line.key))}><Trash2 size={15} /></button></div>{line.option && <span>{line.option.name}</span>}<div className="order-line-bottom"><div className="quantity-stepper compact"><button type="button" aria-label="Decrease quantity" onClick={() => changeQuantity(line.key, -1)}><Minus size={13} /></button><span>{line.quantity}</span><button type="button" aria-label="Increase quantity" onClick={() => changeQuantity(line.key, 1)}><Plus size={13} /></button></div><strong>{formatTzs(line.subtotal)}</strong></div></div></article>)}</div><div className="order-add-more"><a href="#menu" onClick={() => setOrderOpen(false)}>Continue browsing <ArrowRight size={14} /></a><button type="button" onClick={() => setCart([])}>Clear order</button></div>
        <div className="order-customer-fields"><label>Your name <span>Required</span><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Enter your name" autoComplete="name" /></label><label>Phone number <span>Optional</span><input type="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="e.g. +255 7…" autoComplete="tel" /></label><label>Preferred order date <span>Optional</span><input type="date" min={today} value={preferredDate} onChange={(event) => setPreferredDate(event.target.value)} /></label></div>
        <div className="order-total"><span>Estimated total</span><strong>{formatTzs(total)}</strong><small>Availability and final details will be confirmed with you. No payment is taken here.</small></div>
        {orderError && <p className="form-error" role="alert">{orderError}</p>}<button className="button button-dark whatsapp-order-button" type="button" onClick={sendOrder}>Continue on WhatsApp <ArrowRight size={16} /></button><p className="order-privacy-note"><Check size={13} /> Your details are only included in your WhatsApp message.</p>
        </> : <div className="order-empty"><ShoppingBag size={35} strokeWidth={1.2} /><h3>Your order is waiting to be filled.</h3><p>Choose a cake or a freshly baked treat to get started.</p><button type="button" className="button button-dark" onClick={() => setOrderOpen(false)}>Explore the menu <ArrowRight size={15} /></button></div>}</section></div>}
    </main>
  )
}
