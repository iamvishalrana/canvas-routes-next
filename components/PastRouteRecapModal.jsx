'use client'

const INSTAGRAM_URL = 'https://www.instagram.com/canvasroutes?igsh=MWs0encwMTY4cnFyeA%3D%3D&utm_source=qr'
const FACEBOOK_URL = 'https://www.facebook.com/share/1B8GXiPHUe/?mibextid=wwXIfr'

// Shown when a member taps "View Recap" on a completed route — since these
// don't have a real recap page, this points them at the socials where the
// actual day-of photos/videos live instead of navigating to the (now closed)
// registration page.
export default function PastRouteRecapModal({ route, onClose }) {
  if (!route) return null
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,12,0.75)', backdropFilter: 'blur(4px)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#F5F1EC', maxWidth: '460px', width: '100%', maxHeight: '88vh', overflowY: 'auto', position: 'relative', boxShadow: '0 24px 70px rgba(0,0,0,0.35)' }}>
        <button onClick={onClose} aria-label="Close"
          style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 2, background: 'rgba(15,30,20,0.55)', backdropFilter: 'blur(4px)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >×</button>
        <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden' }}>
          <img src={route.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,30,20,0.15) 0%, rgba(15,30,20,0.15) 45%, rgba(15,30,20,0.75) 100%)' }} />
          <div style={{ position: 'absolute', bottom: '16px', left: '20px', right: '20px' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '6px', fontFamily: 'var(--font-inter),sans-serif' }}>Past Route · {route.month_label}</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.9rem', fontWeight: 300, color: '#F5F1EC', lineHeight: 1.1 }}>{route.name}</div>
          </div>
        </div>
        <div style={{ padding: '1.75rem' }}>
          <p style={{ fontSize: '13px', color: '#555', lineHeight: 1.8, marginBottom: '1.5rem' }}>{route.description}</p>
          <div style={{ fontSize: '11px', letterSpacing: '0.03em', color: '#888', marginBottom: '0.9rem' }}>See photos and videos from the day on our socials:</div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0F1E14', background: '#F5F1EC', border: '1px solid #0F1E14', padding: '0.6rem 1.2rem', textDecoration: 'none' }}
            >Instagram →</a>
            <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0F1E14', background: '#F5F1EC', border: '1px solid #0F1E14', padding: '0.6rem 1.2rem', textDecoration: 'none' }}
            >Facebook →</a>
          </div>
        </div>
      </div>
    </div>
  )
}
