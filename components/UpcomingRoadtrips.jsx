'use client'
import { useState, useEffect, useCallback } from 'react'

const ACCENT = '#c5a882'
const ACCENT_BGS = [
  'linear-gradient(135deg, #1a3322 0%, #0F1E14 100%)',
  'linear-gradient(135deg, #1c2e28 0%, #0d1e18 100%)',
  'linear-gradient(135deg, #2a2418 0%, #1a160e 100%)',
  'linear-gradient(135deg, #271e14 0%, #1a1208 100%)',
  'linear-gradient(135deg, #141e2a 0%, #0a1018 100%)',
]
const INTRO = 'Each route launches once the right crew is assembled. Express your interest — we notify you the moment we hit critical mass.'

function PinIcon() {
  return <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
}
function CheckIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}

export default function UpcomingRoadtrips({ isMember = false, memberName = '', memberEmail = '', embedded = false }) {
  const [routes, setRoutes]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [view, setView]           = useState('grid')
  const [selectedId, setSelectedId] = useState(null)
  const [shareRoute, setShareRoute] = useState(null)
  const [animated, setAnimated]   = useState(false)
  const [copied, setCopied]       = useState(false)

  const load = useCallback(() => {
    const qs = memberEmail ? `?email=${encodeURIComponent(memberEmail)}` : ''
    fetch(`/api/upcoming-routes${qs}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setRoutes(list.map(r => ({
          ...r,
          showForm: false,
          interested: !!r.registered,
          error: null,
          submitting: false,
          formName: memberName || '',
          formEmail: memberEmail || '',
          formMembership: !isMember,
        })))
        setLoading(false)
        setSelectedId(list[0]?.id ?? null)
      })
      .catch(() => setLoading(false))
  }, [memberEmail, memberName, isMember])
  useEffect(() => { load() }, [load])

  useEffect(() => { const t = setTimeout(() => setAnimated(true), 140); return () => clearTimeout(t) }, [loading])

  function patch(id, changes) {
    setRoutes(prev => prev.map(r => r.id === id ? { ...r, ...(typeof changes === 'function' ? changes(r) : changes) } : r))
  }

  async function submitInterest(route) {
    const name = (route.formName || '').trim()
    const email = (route.formEmail || '').trim()
    if (!name || name.length < 2) { patch(route.id, { error: 'Please enter your name.' }); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { patch(route.id, { error: 'Please enter a valid email.' }); return }
    patch(route.id, { submitting: true, error: null })
    try {
      const res = await fetch('/api/upcoming-routes/interest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: route.slug, name, email, membership_optin: !isMember && !!route.formMembership, is_member: isMember }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { patch(route.id, { submitting: false, error: data.error || 'Something went wrong.' }); return }
      patch(route.id, {
        submitting: false, showForm: false, interested: true, error: null,
        interested_count: typeof data.interested_count === 'number' ? data.interested_count : route.interested_count + 1,
      })
    } catch { patch(route.id, { submitting: false, error: 'Network error. Please try again.' }) }
  }

  function copyShare() {
    if (!shareRoute) return
    navigator.clipboard?.writeText(`I'm locked in for Canvas Routes: ${shareRoute.name} · ${shareRoute.month_label} — canvasroutes.com`)
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }
  function shareTwitter() {
    if (!shareRoute) return
    const text = `I'm locked in for Canvas Routes: ${shareRoute.name} · ${shareRoute.month_label} 🏁`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
  }

  const totalInterested = routes.reduce((s, r) => s + (r.interested_count || 0), 0)
  const myInterestCount = routes.filter(r => r.interested).length
  const heroBg = '#0F1E14', heroText = '#F5F1EC', heroMuted = 'rgba(245,241,236,0.55)'
  const PADX = embedded ? '0px' : 'clamp(1.5rem,4vw,3rem)' // portal supplies its own gutter

  return (
    <div style={{ background: embedded ? 'transparent' : '#F5F1EC', minHeight: embedded ? undefined : '100vh', fontFamily: "'Inter',var(--font-inter),sans-serif" }}>
      <style>{`
        @keyframes rtFadeUp { from { opacity:0; transform:translateY(28px);} to { opacity:1; transform:translateY(0);} }
        @keyframes rtFadeIn { from { opacity:0;} to { opacity:1;} }
        @keyframes rtShimmer { 0% { background-position:-400px 0;} 100% { background-position:400px 0;} }
        @keyframes rtSuccessPop { 0% { transform:scale(0.92); opacity:0;} 60% { transform:scale(1.03);} 100% { transform:scale(1); opacity:1;} }
        @keyframes rtHeroDivider { from { width:0;} to { width:48px;} }
        @keyframes rtFormDown { from { opacity:0; transform:translateY(-8px);} to { opacity:1; transform:translateY(0);} }
        .rt-hero-1 { opacity:0; animation:rtFadeUp .8s cubic-bezier(.22,.68,0,1.2) .1s forwards; }
        .rt-hero-2 { opacity:0; animation:rtFadeUp .8s cubic-bezier(.22,.68,0,1.2) .28s forwards; }
        .rt-hero-sub { opacity:0; animation:rtFadeIn .7s ease .6s forwards; }
        .rt-hero-meta { opacity:0; animation:rtFadeIn .7s ease .85s forwards; }
        .rt-hero-divider { display:block; height:1px; background:rgba(197,168,130,0.4); margin:28px 0; width:0; animation:rtHeroDivider .8s ease .5s forwards; }
        .rt-card { background:#fff; border:0.5px solid rgba(0,0,0,0.07); display:flex; flex-direction:column; overflow:hidden; opacity:0; transform:translateY(24px); transition:box-shadow .35s ease, transform .35s ease, border-color .35s ease; animation:rtFadeUp .65s cubic-bezier(.22,.68,0,1.1) forwards; }
        @media (hover:hover) { .rt-card:hover { box-shadow:0 12px 48px rgba(0,0,0,0.1), 0 2px 8px rgba(197,168,130,0.12); transform:translateY(-4px); border-color:rgba(197,168,130,0.4); } .rt-card:hover .rt-card-img { transform:scale(1.04); } }
        .rt-card-img { transition:transform .6s ease; }
        .rt-track { background:rgba(0,0,0,0.06); height:3px; overflow:hidden; }
        .rt-fill { height:100%; width:0%; transition:width 1.2s cubic-bezier(.4,0,.2,1); background:linear-gradient(90deg, #c5a882 25%, #f0ddb8 50%, #c5a882 75%); background-size:400px 100%; animation:rtShimmer 2s ease-in-out infinite; }
        .rt-btn { background:#0F1E14; color:#F5F1EC; border:none; font-family:inherit; font-size:11px; letter-spacing:0.14em; text-transform:uppercase; padding:13px 20px; cursor:pointer; transition:background .2s, transform .1s; width:100%; }
        .rt-btn:hover { background:#1a3322; } .rt-btn:active { transform:scale(0.98); } .rt-btn:disabled { opacity:0.6; cursor:default; }
        .rt-ghost { background:transparent; color:#888; border:0.5px solid rgba(0,0,0,0.15); font-family:inherit; font-size:11px; letter-spacing:0.12em; text-transform:uppercase; padding:13px 16px; cursor:pointer; transition:border-color .2s, color .2s; }
        .rt-ghost:hover { border-color:#999; color:#555; }
        .rt-form { overflow:hidden; animation:rtFormDown .35s ease forwards; }
        .rt-input { width:100%; padding:11px 12px; border:0.5px solid rgba(0,0,0,0.15); background:#faf9f7; font-family:inherit; font-size:12px; color:#1a1a1a; outline:none; transition:border-color .2s, background .2s; margin-bottom:8px; }
        .rt-input:focus { border-color:#c5a882; background:#fff; }
        .rt-success { animation:rtSuccessPop .4s cubic-bezier(.22,.68,0,1.2) forwards; }
        .rt-pill { background:transparent; border:0.5px solid rgba(0,0,0,0.18); font-family:inherit; font-size:10px; letter-spacing:0.16em; text-transform:uppercase; padding:9px 22px; cursor:pointer; color:#666; transition:all .2s; }
        .rt-pill-active { background:#0F1E14; color:#F5F1EC; border-color:#0F1E14; }
        .rt-maprow { border:0.5px solid rgba(0,0,0,0.07); background:#fff; padding:14px 18px; cursor:pointer; transition:border-color .2s, background .2s; border-left:3px solid transparent; }
        .rt-maprow:hover { background:#faf9f7; border-color:rgba(197,168,130,0.4); }
        .rt-maprow-active { border-left-color:#c5a882 !important; background:#faf9f7; }
        .rt-backdrop { position:fixed; inset:0; background:rgba(15,30,20,0.7); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:1000; padding:16px; animation:rtFadeIn .2s ease forwards; }
        .rt-modal { background:#F5F1EC; padding:40px; max-width:420px; width:100%; border:0.5px solid rgba(0,0,0,0.1); animation:rtFadeUp .3s cubic-bezier(.22,.68,0,1.1) forwards; }
        @media (max-width:768px) {
          .rt-map-grid { grid-template-columns:1fr !important; }
          .rt-map-placeholder { height:300px !important; }
          .rt-modal { padding:28px 22px; }
        }
      `}</style>

      {/* Compact header for the members-portal embed */}
      {embedded && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase', color: ACCENT, marginBottom: '1rem' }}>Canvas Routes · 2026 Season</div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif", fontSize: 'clamp(2.4rem,5vw,3.4rem)', fontWeight: 300, color: '#1a1a1a', lineHeight: 1.05, margin: 0, letterSpacing: '-0.01em' }}>Upcoming Routes</h1>
          <p style={{ fontSize: '13px', color: '#888', marginTop: '0.9rem', maxWidth: '520px', lineHeight: 1.75 }}>{INTRO}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '1.25rem' }}>
            <span style={{ width: '6px', height: '6px', background: ACCENT, borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: '9px', color: '#8a7a5c', letterSpacing: '0.22em', textTransform: 'uppercase' }}>Member Access · Priority Spots Reserved</span>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      {!embedded && (
      <div style={{ background: heroBg, padding: 'clamp(96px,11vw,132px) clamp(1.5rem,4vw,3rem) clamp(48px,7vw,80px)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(197,168,130,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(197,168,130,0.04) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
          <div className="rt-hero-1" style={{ fontSize: '10px', letterSpacing: '0.32em', textTransform: 'uppercase', color: ACCENT, opacity: 0.7, marginBottom: '20px', fontWeight: 400 }}>Canvas Routes · 2026 Season</div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif", fontSize: 'clamp(3rem,7vw,6rem)', fontWeight: 300, color: heroText, lineHeight: 1.05, margin: 0 }}>
            <span className="rt-hero-1" style={{ display: 'block' }}>Upcoming</span>
            <span className="rt-hero-2" style={{ display: 'block', color: ACCENT, fontStyle: 'italic' }}>Journeys</span>
          </h1>
          <span className="rt-hero-divider" />
          <p className="rt-hero-sub" style={{ fontSize: '14px', color: heroMuted, maxWidth: '520px', lineHeight: 1.85, fontWeight: 300 }}>{INTRO}</p>
          <div className="rt-hero-meta" style={{ display: 'flex', gap: '40px', marginTop: '36px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif", fontSize: '2.4rem', fontWeight: 300, color: ACCENT, lineHeight: 1 }}>{totalInterested}</div>
              <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: heroMuted, marginTop: '4px' }}>Total Interested</div>
            </div>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif", fontSize: '2.4rem', fontWeight: 300, color: heroText, lineHeight: 1 }}>{routes.length}</div>
              <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: heroMuted, marginTop: '4px' }}>Routes Planned</div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ── HOW IT WORKS ── */}
      {!embedded && (
      <div style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.07)', padding: '56px clamp(1.5rem,4vw,3rem)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: ACCENT, marginBottom: '12px' }}>How It Works</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif", fontSize: 'clamp(1.8rem,3vw,2.4rem)', fontWeight: 300, color: '#1a1a1a', margin: '0 0 40px 0' }}>Routes launch when the crew is ready.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 0, border: '0.5px solid rgba(0,0,0,0.07)' }}>
            {[
              ['01', 'Express Interest', "Browse the upcoming routes and register your interest with your name and email. No payment, no commitment — just a signal that you're in."],
              ['02', 'We Hit Critical Mass', 'Each route has a minimum threshold. Once enough drivers are registered, the route officially launches. The progress bar on each card shows exactly where we stand.'],
              ['03', 'You Get Notified', 'The moment a route launches, everyone on the interest list gets an email with full details — meeting point, route, convoy rules, and how to officially register your spot.'],
              ['04', 'You Show Up', 'Arrive at the meeting point, meet the crew, and drive. Each route has a per-car fee determined by the route — length, planned stops, overnight stays, and logistics all factor in. Pricing is confirmed in the launch email.'],
            ].map(([num, title, body], i, arr) => (
              <div key={num} style={{ padding: '32px', borderRight: i < arr.length - 1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none' }}>
                <div style={{ fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif", fontSize: '3rem', fontWeight: 300, color: 'rgba(197,168,130,0.3)', lineHeight: 1, marginBottom: '20px' }}>{num}</div>
                <h3 style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1a', margin: '0 0 10px 0', letterSpacing: '0.04em' }}>{title}</h3>
                <p style={{ fontSize: '12px', color: '#888', lineHeight: 1.8, margin: 0, fontWeight: 300 }}>{body}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '11px', color: '#bbb', margin: '20px 0 0 0', lineHeight: 1.7, maxWidth: '680px' }}>Per-car fees are set per route based on length, stops, and overnight stays — exact pricing is confirmed in the launch email. Routes that don't reach their threshold by 30 days before the planned date are postponed to a future season.</p>
        </div>
      </div>

      )}

      {/* ── MEMBERSHIP NUDGE / MEMBER BADGE ── */}
      {!embedded && (!isMember ? (
        <div style={{ background: '#0F1E14', padding: '13px clamp(1.5rem,4vw,3rem)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '11px', color: 'rgba(245,241,236,0.5)', margin: 0, letterSpacing: '0.05em' }}>Members receive priority spots and early launch notifications.</p>
            <a href="/membership" style={{ fontSize: '10px', color: ACCENT, letterSpacing: '0.16em', textTransform: 'uppercase', textDecoration: 'none', border: '0.5px solid rgba(197,168,130,0.35)', padding: '7px 18px' }}>Apply for Membership →</a>
          </div>
        </div>
      ) : (
        <div style={{ background: '#0F1E14', padding: '10px clamp(1.5rem,4vw,3rem)', borderTop: '0.5px solid rgba(197,168,130,0.1)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '6px', height: '6px', background: ACCENT, borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: '9px', color: 'rgba(197,168,130,0.8)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>Member Access · Priority Spots Reserved</span>
          </div>
        </div>
      ))}

      {/* ── VIEW TOGGLE ── */}
      <div style={{ background: embedded ? 'transparent' : '#F5F1EC', borderBottom: '0.5px solid rgba(0,0,0,0.08)', padding: `20px ${PADX}`, marginTop: embedded ? '0.5rem' : 0 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setView('grid')} className={`rt-pill${view === 'grid' ? ' rt-pill-active' : ''}`}>Grid</button>
          <button onClick={() => setView('map')} className={`rt-pill${view === 'map' ? ' rt-pill-active' : ''}`}>Map</button>
          <div style={{ width: '0.5px', height: '16px', background: 'rgba(0,0,0,0.12)', margin: '0 12px' }} />
          <span style={{ fontSize: '10px', color: '#bbb', letterSpacing: '0.1em' }}>{myInterestCount} / {routes.length} routes registered</span>
        </div>
      </div>

      {/* ── GRID / MAP ── */}
      {loading ? (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: `clamp(48px,8vw,96px) ${PADX}`, textAlign: 'center', fontSize: '13px', color: '#bbb' }}>Loading routes…</div>
      ) : view === 'grid' ? (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: `clamp(32px,5vw,56px) ${PADX}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px,1fr))', gap: '20px' }}>
            {routes.map((r, i) => {
              const pct = Math.min(100, Math.round((r.interested_count / r.target_count) * 100))
              const slotsLeft = Math.max(0, r.target_count - r.interested_count)
              return (
                <div key={r.id} className="rt-card" style={{ animationDelay: `${i * 0.08 + 0.05}s` }}>
                  {/* Image area */}
                  <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '16/9', background: ACCENT_BGS[i % ACCENT_BGS.length] }}>
                    <div className="rt-card-img" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' }}>
                      <div style={{ fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif", fontSize: 'clamp(1.2rem,3vw,1.6rem)', fontWeight: 300, color: 'rgba(245,241,236,0.18)', textAlign: 'center', letterSpacing: '0.06em', lineHeight: 1.2 }}>{r.name}</div>
                      <div style={{ position: 'absolute', bottom: '14px', left: '14px', background: 'rgba(15,30,20,0.75)', backdropFilter: 'blur(6px)', padding: '5px 12px', border: '0.5px solid rgba(197,168,130,0.2)' }}>
                        <span style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: ACCENT, fontWeight: 500 }}>{r.month_label}</span>
                      </div>
                      {isMember && (
                        <div style={{ position: 'absolute', top: '14px', right: '14px', background: ACCENT, padding: '4px 10px' }}>
                          <span style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0F1E14', fontWeight: 600 }}>Priority</span>
                        </div>
                      )}
                      <div style={{ position: 'absolute', top: '14px', left: '14px', background: 'rgba(15,30,20,0.75)', backdropFilter: 'blur(6px)', padding: '5px 12px', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                        <span style={{ fontSize: '9px', color: 'rgba(245,241,236,0.6)', letterSpacing: '0.1em' }}>{r.interested_count} interested</span>
                      </div>
                    </div>
                  </div>
                  {/* Body */}
                  <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '14px' }}>
                      <h3 style={{ fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif", fontSize: '21px', fontWeight: 300, color: '#1a1a1a', marginBottom: '5px', lineHeight: 1.2 }}>{r.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <PinIcon /><span style={{ fontSize: '11px', color: '#aaa', letterSpacing: '0.04em' }}>{r.destination}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: '12.5px', color: '#777', lineHeight: 1.8, marginBottom: '20px', flex: 1, fontWeight: 300 }}>{r.description}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: '0.5px solid rgba(0,0,0,0.06)', marginBottom: '18px' }}>
                      <div style={{ padding: '11px 14px', borderRight: '0.5px solid rgba(0,0,0,0.06)' }}>
                        <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#ccc', marginBottom: '3px' }}>Duration</div>
                        <div style={{ fontSize: '13px', color: '#333' }}>{r.duration_label}</div>
                      </div>
                      <div style={{ padding: '11px 14px' }}>
                        <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#ccc', marginBottom: '3px' }}>Distance</div>
                        <div style={{ fontSize: '13px', color: '#333' }}>{r.distance_label}</div>
                      </div>
                    </div>
                    {/* Progress */}
                    <div style={{ marginBottom: '18px' }}>
                      <div className="rt-track" style={{ marginBottom: '7px' }}>
                        <div className="rt-fill" style={{ width: animated ? `${pct}%` : '0%' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '10px', color: '#bbb', letterSpacing: '0.06em' }}>{r.interested_count} / {r.target_count}</span>
                        <span style={{ fontSize: '10px', color: ACCENT, letterSpacing: '0.06em' }}>{slotsLeft} spots left</span>
                      </div>
                    </div>
                    {/* CTA */}
                    {r.interested ? (
                      <div className="rt-success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(197,168,130,0.06)', border: '0.5px solid rgba(197,168,130,0.25)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                          <CheckIcon /><span style={{ fontSize: '10px', color: '#7B5B2E', letterSpacing: '0.18em', textTransform: 'uppercase' }}>You're on the list</span>
                        </div>
                        <button onClick={() => { setShareRoute(r); setCopied(false) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: ACCENT, fontSize: '13px', padding: '2px 4px' }} aria-label="Share">↗</button>
                      </div>
                    ) : r.launched ? (
                      <div style={{ padding: '12px 14px', background: 'rgba(197,168,130,0.08)', border: '0.5px solid rgba(197,168,130,0.3)', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#7B5B2E', textAlign: 'center' }}>Route launched — check your email</div>
                    ) : !r.showForm ? (
                      <button onClick={() => patch(r.id, { showForm: true, error: null })} className="rt-btn">Express Interest</button>
                    ) : (
                      <div className="rt-form">
                        <input type="text" placeholder="Your name" value={r.formName} onChange={e => patch(r.id, { formName: e.target.value, error: null })} className="rt-input" />
                        <input type="email" placeholder="Your email" value={r.formEmail} onChange={e => patch(r.id, { formEmail: e.target.value, error: null })} className="rt-input" style={{ marginBottom: '12px' }} />
                        {!isMember && (
                          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '14px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={!!r.formMembership} onChange={e => patch(r.id, { formMembership: e.target.checked })} style={{ cursor: 'pointer', accentColor: ACCENT, marginTop: '1px', flexShrink: 0 }} />
                            <span style={{ fontSize: '11px', color: '#999', lineHeight: 1.5, letterSpacing: '0.02em' }}>Add me to the membership waitlist</span>
                          </label>
                        )}
                        {r.error && <div style={{ fontSize: '11px', color: '#93333E', marginBottom: '10px' }}>{r.error}</div>}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => submitInterest(r)} disabled={r.submitting} className="rt-btn" style={{ flex: 1, padding: '13px' }}>{r.submitting ? 'Saving…' : 'Lock In'}</button>
                          <button onClick={() => patch(r.id, { showForm: false, error: null })} className="rt-ghost" aria-label="Cancel">✕</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: `clamp(32px,5vw,56px) ${PADX}` }}>
          <div className="rt-map-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'start' }}>
            <div className="rt-map-placeholder" style={{ background: '#EDE8E1', border: '0.5px solid rgba(0,0,0,0.07)', height: '580px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px' }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#bbb', marginBottom: '6px' }}>Interactive Map</div>
                <div style={{ fontSize: '12px', color: '#ccc', fontWeight: 300 }}>All routes plotted — Mapbox integration</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '8px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#999', marginBottom: '8px', paddingLeft: '4px' }}>All Routes</div>
              {routes.map(r => {
                const pct = Math.min(100, Math.round((r.interested_count / r.target_count) * 100))
                return (
                  <div key={r.id} onClick={() => setSelectedId(r.id)} className={`rt-maprow${selectedId === r.id ? ' rt-maprow-active' : ''}`}>
                    <div style={{ fontSize: '13px', color: '#1a1a1a', marginBottom: '3px', fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif" }}>{r.name}</div>
                    <div style={{ fontSize: '9px', color: ACCENT, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>{r.month_label}</div>
                    <div className="rt-track"><div className="rt-fill" style={{ width: animated ? `${pct}%` : '0%', animation: 'none', background: ACCENT }} /></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                      <span style={{ fontSize: '10px', color: '#bbb' }}>{r.interested_count}/{r.target_count}</span>
                      <span style={{ fontSize: '10px', color: '#aaa' }}>{r.destination}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── SHARE MODAL ── */}
      {shareRoute && (
        <div className="rt-backdrop" onClick={() => setShareRoute(null)}>
          <div className="rt-modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: ACCENT, marginBottom: '12px' }}>Share Route</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif", fontSize: '26px', fontWeight: 300, color: '#1a1a1a', marginBottom: '6px' }}>{shareRoute.name}</h2>
            <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '28px', lineHeight: 1.7 }}>Let your crew know you're locked in for this drive.</p>
            <div style={{ background: '#EDE8E1', padding: '14px 16px', border: '0.5px solid rgba(0,0,0,0.07)', marginBottom: '24px' }}>
              <p style={{ fontSize: '11px', color: '#666', lineHeight: 1.65 }}>I'm locked in for Canvas Routes: {shareRoute.name} · {shareRoute.month_label}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button onClick={copyShare} className="rt-btn" style={{ flex: 1, padding: '12px' }}>{copied ? 'Copied ✓' : 'Copy Text'}</button>
              <button onClick={shareTwitter} className="rt-ghost" style={{ flex: 1 }}>Twitter / X</button>
            </div>
            <button onClick={() => setShareRoute(null)} style={{ width: '100%', background: 'transparent', border: 'none', fontFamily: 'inherit', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#bbb', padding: '8px', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      {!embedded && (
        <div style={{ background: '#0F1E14', padding: '28px clamp(1.5rem,4vw,3rem)', marginTop: '80px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '10px', color: 'rgba(245,241,236,0.25)', letterSpacing: '0.1em' }}>© 2026 Canvas Routes Inc. — Montreal, QC</span>
            <a href="/" style={{ fontSize: '10px', color: 'rgba(197,168,130,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none' }}>canvasroutes.com →</a>
          </div>
        </div>
      )}
    </div>
  )
}
