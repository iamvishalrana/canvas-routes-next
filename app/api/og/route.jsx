import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || 'Canvas Routes'
  const subtitle = searchParams.get('subtitle') || 'Montreal\'s premier automotive community'
  const label = searchParams.get('label') || 'Canvas Routes · Montreal'

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          width: '100%',
          height: '100%',
          background: '#0F1E14',
          padding: '64px 72px',
          fontFamily: 'Georgia, serif',
          position: 'relative',
        }}
      >
        {/* Top gold line */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #c5a882, transparent)',
          display: 'flex',
        }} />

        {/* Corner mark */}
        <div style={{
          position: 'absolute',
          top: '52px', right: '72px',
          fontSize: '11px',
          letterSpacing: '3px',
          textTransform: 'uppercase',
          color: 'rgba(197,168,130,0.5)',
          fontFamily: 'Arial, sans-serif',
          display: 'flex',
        }}>
          canvasroutes.com
        </div>

        {/* Label */}
        <div style={{
          fontSize: '13px',
          letterSpacing: '3px',
          textTransform: 'uppercase',
          color: 'rgba(197,168,130,0.7)',
          marginBottom: '20px',
          fontFamily: 'Arial, sans-serif',
          display: 'flex',
        }}>
          {label}
        </div>

        {/* Title */}
        <div style={{
          fontSize: '72px',
          fontWeight: '300',
          color: '#F5F1EC',
          lineHeight: '1.05',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
        }}>
          {title}
        </div>

        {/* Gold divider */}
        <div style={{
          width: '48px',
          height: '1px',
          background: 'rgba(197,168,130,0.5)',
          marginBottom: '20px',
          display: 'flex',
        }} />

        {/* Subtitle */}
        <div style={{
          fontSize: '22px',
          color: 'rgba(245,241,236,0.5)',
          lineHeight: '1.6',
          fontFamily: 'Arial, sans-serif',
          display: 'flex',
        }}>
          {subtitle}
        </div>

        {/* Bottom gold line */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: '1px',
          background: 'rgba(197,168,130,0.2)',
          display: 'flex',
        }} />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
