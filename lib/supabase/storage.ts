import { createClient } from '@/lib/supabase/client'

const bucket = 'catalogue-images'

export async function uploadCatalogueImage(file: File, folder: 'products' | 'business' = 'products') {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Choose an image smaller than 5 MB.')

  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${folder}/${crypto.randomUUID()}.${extension}`
  const supabase = createClient()
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new Error('Image upload failed. Check your login and try again.')
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

export async function deleteCatalogueImage(imageUrl: string) {
  const marker = `/storage/v1/object/public/${bucket}/`
  const index = imageUrl.indexOf(marker)
  if (index === -1) return

  const path = decodeURIComponent(imageUrl.slice(index + marker.length))
  if (!path || path.includes('..')) return
  const { error } = await createClient().storage.from(bucket).remove([path])
  if (error) throw new Error('The catalogue changed, but the previous image could not be removed.')
}
