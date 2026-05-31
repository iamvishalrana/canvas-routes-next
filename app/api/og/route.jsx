import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const type = searchParams.get('type') || 'logo'

  if (type === 'event') {
    const title = searchParams.get('title') || 'Canvas Routes'
    const date = searchParams.get('date') || ''
    const bg = searchParams.get('bg') || '/trem-trip.png'
    const bgUrl = bg.startsWith('http') ? bg : `${origin}${bg}`

    return new ImageResponse(
      (
        <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative' }}>
          <img
            src={bgUrl}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '70% 80%' }}
          />
          {/* Dark overlay */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10,20,12,0.68)', display: 'flex' }} />
          {/* Top gold line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, transparent, rgba(197,168,130,0.8), transparent)', display: 'flex' }} />
          {/* Content */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center',
            padding: '64px',
          }}>
            <div style={{ fontSize: '13px', letterSpacing: '4px', textTransform: 'uppercase', color: 'rgba(197,168,130,0.7)', marginBottom: '20px', fontFamily: 'Arial, sans-serif', display: 'flex' }}>
              Canvas Routes
            </div>
            <div style={{ fontSize: '86px', fontWeight: '300', color: '#F5F1EC', lineHeight: '1.05', textAlign: 'center', fontFamily: 'Georgia, serif', display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
              {title}
            </div>
            {date && (
              <div style={{
                marginTop: '28px', padding: '10px 28px',
                border: '0.5px solid rgba(197,168,130,0.5)',
                fontSize: '12px', letterSpacing: '3px', textTransform: 'uppercase',
                color: '#c5a882', fontFamily: 'Arial, sans-serif', display: 'flex',
              }}>
                {date}
              </div>
            )}
          </div>
          {/* Bottom gold line */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'rgba(197,168,130,0.2)', display: 'flex' }} />
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }

  // Default: logo on dark green
  const logoUrl = `${origin}/canvas_routes_refined.png`

  return new ImageResponse(
    (
      <div style={{
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        width: '100%', height: '100%',
        background: '#0F1E14', position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, rgba(197,168,130,0.6), transparent)', display: 'flex' }} />
        <img src={logoUrl} style={{ width: '380px', objectFit: 'contain' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'rgba(197,168,130,0.2)', display: 'flex' }} />
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
