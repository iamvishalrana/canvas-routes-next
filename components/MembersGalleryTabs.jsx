'use client'
import { useState } from 'react'
import MembersGallery from './MembersGallery'
import MemberPhotoUpload from './MemberPhotoUpload'

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

export default function MembersGalleryTabs({ eventAlbums, personalAlbum, attendedEventNames = [] }) {
  const [tab, setTab] = useState('event')
  const albums = tab === 'event' ? eventAlbums : (personalAlbum.photos.length ? [personalAlbum] : [])
  const copy = EMPTY_COPY[tab]

  return (
    <div>
      <style>{`
        @keyframes mgt-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .mgt-tab-content { animation: mgt-fade-in 0.4s cubic-bezier(0.23,1,0.32,1) both; }
        .mgt-tab-btn { transition: color 0.2s ease, border-color 0.2s ease; }
      `}</style>

      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', marginBottom: '1rem' }}>
        {[['event', 'Event Photos'], ['personal', 'My Car & Personal']].map(([key, label]) => (
          <button key={key} type="button" className="mgt-tab-btn" onClick={() => setTab(key)}
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

      {/* Keyed on tab so the fade-in replays every time the tab changes */}
      <div key={tab} className="mgt-tab-content">
        <div style={{ fontSize: '10.5px', color: '#bbb', marginBottom: '1.75rem', fontFamily: 'var(--font-inter), sans-serif' }}>
          To get a photo removed, please reach out to us at{' '}
          <a href="mailto:info@canvasroutes.com" style={{ color: '#bbb' }}>info@canvasroutes.com</a>.
        </div>

        {tab === 'event' && <MemberPhotoUpload attendedEventNames={attendedEventNames} />}

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
    </div>
  )
}
