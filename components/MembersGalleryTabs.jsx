'use client'
import { useState } from 'react'
import MembersGallery from './MembersGallery'

const EMPTY_COPY = {
  event: {
    title: 'Nothing here yet',
    body: 'Photos from events you’ve attended will appear here once we post them. Check back soon.',
  },
  personal: {
    title: 'No photos yet',
    body: 'Your car and personal photos will appear here once we’ve added them — only you can see this folder.',
  },
}

export default function MembersGalleryTabs({ eventAlbums, personalAlbum }) {
  const [tab, setTab] = useState('event')
  const albums = tab === 'event' ? eventAlbums : (personalAlbum.photos.length ? [personalAlbum] : [])
  const copy = EMPTY_COPY[tab]

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', marginBottom: '2.5rem' }}>
        {[['event', 'Event Photos'], ['personal', 'My Car & Personal']].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            style={{
              padding: '0.6rem 1.2rem', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase',
              border: 'none', borderBottom: tab === key ? '2px solid #45643C' : '2px solid transparent',
              background: 'none', color: tab === key ? '#1a1a1a' : '#aaa', cursor: 'pointer',
              fontFamily: 'var(--font-inter), sans-serif', fontWeight: tab === key ? '600' : '400',
              WebkitTapHighlightColor: 'transparent',
            }}>
            {label}
          </button>
        ))}
      </div>

      {albums.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1.5rem', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', fontFamily: 'var(--font-inter), sans-serif' }}>
          <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.5rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '0.75rem' }}>
            {copy.title}
          </div>
          <div style={{ fontSize: '13px', color: '#999', lineHeight: 1.8, maxWidth: '380px', margin: '0 auto' }}>
            {copy.body}
          </div>
        </div>
      ) : (
        <MembersGallery albums={albums} />
      )}
    </div>
  )
}
