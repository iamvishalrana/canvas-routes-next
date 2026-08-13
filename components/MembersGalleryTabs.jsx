'use client'
import MembersGallery from './MembersGallery'
import MemberPhotoUpload from './MemberPhotoUpload'
import FadeUp from './FadeUp'
import { membersPhotosT } from '../lib/i18n/membersPhotos'

function EmptyState({ title, body }) {
  return (
    <FadeUp delay={120}>
      <div style={{ textAlign: 'center', padding: '2.75rem 1.25rem', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', fontFamily: 'var(--font-inter), sans-serif' }}>
        <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.3rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '0.6rem' }}>
          {title}
        </div>
        <div style={{ fontSize: '12.5px', color: '#999', lineHeight: 1.8, maxWidth: '340px', margin: '0 auto' }}>
          {body}
        </div>
      </div>
    </FadeUp>
  )
}

// Personal (left) and Event (right) photos shown side by side rather than
// behind tabs — members attending an event still need the upload widget
// visible without an extra click, and comparing "what's mine" vs "what's
// shared" reads more naturally next to each other than switched between.
export default function MembersGalleryTabs({ eventAlbums, personalAlbum, attendedEventNames = [], lang = 'en' }) {
  const t = membersPhotosT[lang]
  const hasPersonal = personalAlbum.photos.length > 0
  const hasEvents = eventAlbums.length > 0

  const colHeading = {
    fontFamily: 'var(--font-cormorant), serif', fontSize: '1.4rem', fontWeight: '400',
    color: '#1a1a1a', margin: '0 0 1.25rem', paddingBottom: '0.85rem',
    borderBottom: '0.5px solid rgba(0,0,0,0.08)',
  }

  return (
    <div>
      <style>{`
        @keyframes mgt-fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .mgt-col { animation: mgt-fade-in 0.45s cubic-bezier(0.23,1,0.32,1) both; }
        .mgt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: start; }
        @media (max-width: 860px) {
          .mgt-grid { grid-template-columns: 1fr; gap: 2.75rem; }
        }
      `}</style>

      <div style={{ fontSize: '10.5px', color: '#bbb', marginBottom: '2rem', fontFamily: 'var(--font-inter), sans-serif' }}>
        {t.removeNotice}{' '}
        <a href="mailto:info@canvasroutes.com" style={{ color: '#bbb' }}>info@canvasroutes.com</a>.
      </div>

      <div className="mgt-grid">
        {/* Left — My Car & Personal */}
        <div className="mgt-col">
          <h2 style={colHeading}>{t.myCarAndPersonal}</h2>
          {hasPersonal ? (
            <MembersGallery albums={[personalAlbum]} lang={lang} />
          ) : (
            <EmptyState title={t.personalEmptyTitle} body={t.personalEmptyBody} />
          )}
        </div>

        {/* Right — Event Photos */}
        <div className="mgt-col" style={{ animationDelay: '90ms' }}>
          <h2 style={colHeading}>{t.eventPhotos}</h2>
          <MemberPhotoUpload attendedEventNames={attendedEventNames} lang={lang} />
          {hasEvents ? (
            <MembersGallery albums={eventAlbums} lang={lang} />
          ) : (
            <EmptyState title={t.eventEmptyTitle} body={t.eventEmptyBody} />
          )}
        </div>
      </div>
    </div>
  )
}
