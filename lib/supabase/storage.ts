import type { SupabaseClient } from '@supabase/supabase-js'
import { CATALOGUE_BUCKET, SUPABASE_URL } from './config'

const MAX_RAW_FILE_BYTES = 10 * 1024 * 1024 // 10 MB before client optimization
const MAX_DIMENSION = 1200

type OptimizedImage = {
  blob: Blob
  extension: string
  contentType: string
}

function optimizeImageForUpload(file: File, preserveTransparency = false): Promise<OptimizedImage> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose a valid image file (JPEG, PNG, or WebP).'))
      return
    }
    if (file.size > MAX_RAW_FILE_BYTES) {
      reject(new Error('Image is too large. Please select an image under 10 MB.'))
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const image = new window.Image()

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('This image could not be opened.'))
    }

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const ratio = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * ratio))
      canvas.height = Math.max(1, Math.round(image.height * ratio))

      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('Image processing is unavailable in this browser.'))
        return
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height)

      const keepPng = preserveTransparency && file.type === 'image/png'
      const contentType = keepPng ? 'image/png' : 'image/jpeg'
      const extension = keepPng ? 'png' : 'jpg'
      const quality = keepPng ? undefined : 0.84

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Unable to prepare image for upload.'))
            return
          }
          resolve({ blob, extension, contentType })
        },
        contentType,
        quality
      )
    }

    image.src = objectUrl
  })
}

export async function uploadCatalogueImage(
  supabase: SupabaseClient,
  file: File,
  folder: 'products' | 'branding' = 'products'
): Promise<{ publicUrl: string; path: string }> {
  const { blob, extension, contentType } = await optimizeImageForUpload(
    file,
    folder === 'branding'
  )

  const uniqueId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const path = `${folder}/${Date.now()}-${uniqueId}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from(CATALOGUE_BUCKET)
    .upload(path, blob, {
      contentType,
      cacheControl: '31536000',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(
      uploadError.message || 'Unable to upload the image to Supabase Storage.'
    )
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(CATALOGUE_BUCKET).getPublicUrl(path)

  return { publicUrl, path }
}

export function extractStoragePathFromUrl(publicUrl: string | null | undefined): string | null {
  if (!publicUrl) return null
  if (!publicUrl.startsWith('http://') && !publicUrl.startsWith('https://')) {
    return null
  }

  const marker = `/storage/v1/object/public/${CATALOGUE_BUCKET}/`
  try {
    const parsed = new URL(publicUrl)
    if (SUPABASE_URL) {
      const expectedHost = new URL(SUPABASE_URL).host
      if (parsed.host !== expectedHost) return null
    }
    const index = parsed.pathname.indexOf(marker)
    if (index === -1) return null
    const relativePath = parsed.pathname.slice(index + marker.length)
    return relativePath ? decodeURIComponent(relativePath) : null
  } catch {
    return null
  }
}

export async function deleteCatalogueImageByUrl(
  supabase: SupabaseClient,
  publicUrl: string | null | undefined
): Promise<void> {
  const path = extractStoragePathFromUrl(publicUrl)
  if (!path) return

  const { error } = await supabase.storage.from(CATALOGUE_BUCKET).remove([path])
  if (error) {
    // Non-fatal: the database mutation has already succeeded or been cancelled.
    console.warn('Could not clean up image from Supabase Storage:', error.message)
  }
}
