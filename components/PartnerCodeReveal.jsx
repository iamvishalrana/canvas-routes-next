'use client'
import { useState } from 'react'

// Per-member one-time code, claimed from a finite pool (see
// supabase/migrations/20260805_partner_codes.sql). Replaces the static
// "how" paragraph for partners with hasCode:true in lib/partners.js.
export default function PartnerCodeReveal({ slug, instructions, t }) {
  const [code, setCode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  async function reveal() {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/member/partner-code/${slug}`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || t.codeError); return }
      setCode(data.code)
    } catch { setError(t.codeError) }
    finally { setLoading(false) }
  }

  function copy() {
    if (!code || !navigator.clipboard?.writeText) return
    navigator.clipboard.writeText(code)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) })
      .catch(() => {})
  }

  return (
    <div>
      <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.85, letterSpacing: '0.01em', margin: '0 0 1rem' }}>
        {instructions}
      </p>
      {code ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.4rem', letterSpacing: '0.08em', color: '#0F1E14', background: '#F5F1EC', border: '0.5px solid rgba(197,168,130,0.4)', padding: '0.5rem 1rem', userSelect: 'all', WebkitUserSelect: 'all' }}>
            {code}
          </span>
          <button type="button" onClick={copy}
            style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0F1E14', background: 'none', border: 'none', borderBottom: '0.5px solid rgba(15,30,20,0.22)', cursor: 'pointer', padding: '0.6rem 0', minHeight: '44px', fontFamily: 'var(--font-inter), sans-serif', WebkitTapHighlightColor: 'transparent' }}>
            {copied ? t.copiedCode : t.copyCode}
          </button>
        </div>
      ) : (
        <button type="button" onClick={reveal} disabled={loading}
          style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#F5F1EC', background: '#0F1E14', border: 'none', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.65 : 1, padding: '0.85rem 1.6rem', minHeight: '44px', fontFamily: 'var(--font-inter), sans-serif', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}>
          {loading ? t.revealingCode : t.revealCode}
        </button>
      )}
      {error && <div style={{ fontSize: '12px', color: '#93333E', marginTop: '0.75rem', lineHeight: 1.6 }}>{error}</div>}
    </div>
  )
}
