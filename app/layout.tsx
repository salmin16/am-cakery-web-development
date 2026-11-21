import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { BakeryStoreProvider } from '@/components/bakery-store'
import './globals.css'

export const metadata: Metadata = {
  title: 'AM CAKERY | Freshly Baked. Beautifully Made.',
  description: 'Discover cakes, sambusa, donuts and freshly baked treats from AM CAKERY in Ubungo Riverside, Dar es Salaam. Choose your favourites and order on WhatsApp.',
  applicationName: 'AM CAKERY',
  icons: { icon: '/am-cakery-logo.png', apple: '/am-cakery-logo.png' },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#fbf6ef',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <BakeryStoreProvider>{children}</BakeryStoreProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
