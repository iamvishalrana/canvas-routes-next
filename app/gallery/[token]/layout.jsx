import { createAdminClient } from '../../../lib/supabase/admin'

export async function generateMetadata({ params }) {
  const { token } = await params
  const admin = createAdminClient()
  const { data: share } = await admin.from('photo_shares').select('id, title').eq('token', token).maybeSingle()

  let bg = null
  if (share) {
    const { data: firstItem } = await admin.from('photo_share_items')
      .select('storage_path').eq('share_id', share.id).order('created_at', { ascending: true }).limit(1).maybeSingle()
    if (firstItem) {
      const { data: { publicUrl } } = admin.storage.from('photo-shares').getPublicUrl(firstItem.storage_path)
      bg = publicUrl
    }
  }

  const title = share ? `${share.title} | Canvas Routes` : 'Photo Gallery | Canvas Routes'
  const description = 'A private photo gallery shared by Canvas Routes.'
  const ogParams = new URLSearchParams({ type: 'event', title: share?.title || 'Photo Gallery' })
  if (bg) ogParams.set('bg', bg)
  const ogImage = `https://canvasroutes.com/api/og?${ogParams.toString()}`

  return {
    title,
    description,
    // Shared, unlisted pages — never indexed, and never linked from anywhere
    // crawlable, but robots directives are a defense-in-depth belt-and-braces
    // measure in case a link leaks somewhere.
    robots: { index: false, follow: false },
    openGraph: { type: 'website', siteName: 'Canvas Routes', title, description, images: [{ url: ogImage, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
  }
}

export default function GalleryShareLayout({ children }) {
  return children
}
