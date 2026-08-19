import { createAdminClient } from '../../../lib/supabase/admin'

export async function generateMetadata({ params }) {
  const { token } = await params
  const admin = createAdminClient()
  const { data: person } = await admin.from('photo_share_people').select('id, name').eq('token', token).maybeSingle()

  let bg = null
  if (person) {
    const { data: folders } = await admin.from('photo_share_folders').select('id').eq('person_id', person.id)
    const folderIds = (folders || []).map(f => f.id)
    const { data: firstLink } = folderIds.length
      ? await admin.from('photo_share_folder_items').select('photo:photo_share_photos(storage_path)').in('folder_id', folderIds).order('created_at', { ascending: true }).limit(1).maybeSingle()
      : { data: null }
    if (firstLink?.photo) {
      const { data: { publicUrl } } = admin.storage.from('photo-shares').getPublicUrl(firstLink.photo.storage_path)
      bg = publicUrl
    }
  }

  const pageTitle = person?.name ? `${person.name}'s Photos` : 'Photo Gallery'
  const title = `${pageTitle} | Canvas Routes`
  const description = 'A private photo gallery shared by Canvas Routes.'
  const ogParams = new URLSearchParams({ type: 'event', title: pageTitle })
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
