'use client'

// All-day ICS download — date-only avoids timezone bugs entirely.
// Renders nothing unless the event has a parseable ISO date (YYYY-MM-DD).
export default function AddToCalendar({ name, date, location, description }) {
  const isoDate = (date || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null

  function download() {
    const dStart = isoDate.replace(/-/g, '')
    const next = new Date(`${isoDate}T00:00:00Z`)
    next.setUTCDate(next.getUTCDate() + 1)
    const dEnd = next.toISOString().slice(0, 10).replace(/-/g, '')
    const esc = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Canvas Routes//Members Portal//EN',
      'BEGIN:VEVENT',
      `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@canvasroutes.com`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}Z`,
      `DTSTART;VALUE=DATE:${dStart}`,
      `DTEND;VALUE=DATE:${dEnd}`,
      `SUMMARY:${esc(name)}`,
      location ? `LOCATION:${esc(location)}` : null,
      description ? `DESCRIPTION:${esc(description)}` : null,
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
    a.download = `${(name || 'event').replace(/[^\w\s-]/g, '').trim().slice(0, 60) || 'event'}.ics`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <button
      type="button"
      onClick={download}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        fontSize: '12px', color: '#888', fontFamily: 'var(--font-inter), sans-serif',
        textDecoration: 'underline', textDecorationColor: 'rgba(0,0,0,0.15)', textUnderlineOffset: '3px',
      }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>
      Add to calendar
    </button>
  )
}
