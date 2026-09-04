'use client'
import { useState, useEffect, useCallback } from 'react'
import { inp, Err, ConfirmDialog } from '../_components/shared'

const SECTION_STYLE = { padding: 'clamp(1.5rem, 3vw, 2.5rem)' }
const CARD = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.5rem 1.75rem', marginBottom: '1.5rem' }
const SECTION_LABEL = { fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', marginBottom: '1.25rem', fontFamily: 'var(--font-inter),sans-serif' }

function ToggleSetting({ label, description, value, onChange, saving }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '2rem', paddingBottom: '1.25rem', marginBottom: '1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', fontFamily: 'var(--font-inter),sans-serif', marginBottom: '0.25rem' }}>{label}</div>
        <div style={{ fontSize: '12px', color: '#888', fontFamily: 'var(--font-inter),sans-serif', lineHeight: 1.5 }}>{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => !saving && onChange(!value)}
        style={{
          position: 'relative', flexShrink: 0, width: '40px', height: '22px',
          background: value ? '#0F1E14' : 'rgba(0,0,0,0.15)',
          border: 'none', borderRadius: '11px',
          cursor: saving ? 'wait' : 'pointer',
          transition: 'background 0.18s',
          opacity: saving ? 0.6 : 1,
          marginTop: '2px',
        }}
      >
        <span style={{
          position: 'absolute', top: '3px', left: value ? '20px' : '3px',
          width: '16px', height: '16px', background: '#fff', borderRadius: '50%',
          transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          display: 'block',
        }} />
      </button>
    </div>
  )
}

function TextSetting({ label, description, value, onChange, onSave, saving, placeholder, type = 'text' }) {
  return (
    <div style={{ paddingBottom: '1.25rem', marginBottom: '1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', fontFamily: 'var(--font-inter),sans-serif', marginBottom: '0.25rem' }}>{label}</div>
      {description && <div style={{ fontSize: '12px', color: '#888', fontFamily: 'var(--font-inter),sans-serif', lineHeight: 1.5, marginBottom: '0.65rem' }}>{description}</div>}
      {type === 'textarea' ? (
        <textarea
          style={{ ...inp, height: '72px', resize: 'vertical', marginBottom: '0.5rem' }}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          style={{ ...inp, marginBottom: '0.5rem' }}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        style={{ padding: '0.4rem 1rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: saving ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: saving ? 0.6 : 1 }}
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}

function maskEmail(email) {
  return String(email || '').replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}${'*'.repeat(Math.min(b.length, 4))}${c}`)
}

function MfaCard() {
  const [enabled, setEnabled] = useState(null) // null = loading
  const [loadError, setLoadError] = useState(false)
  const [step, setStep] = useState('idle') // idle | sending | code | verifying
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)
  const [disabling, setDisabling] = useState(false)

  const [recoveryEmail, setRecoveryEmail] = useState(null)
  const [recoveryStep, setRecoveryStep] = useState('idle') // idle | editing | sending | code | saving
  const [recoveryInput, setRecoveryInput] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [recoveryError, setRecoveryError] = useState('')
  const [recoveryCooldown, setRecoveryCooldown] = useState(0)
  const [showRemoveRecoveryConfirm, setShowRemoveRecoveryConfirm] = useState(false)
  const [removingRecovery, setRemovingRecovery] = useState(false)

  // Recovery codes
  const [codesRemaining, setCodesRemaining] = useState(0)
  const [generatedCodes, setGeneratedCodes] = useState(null) // shown once, right after generating
  const [generatingCodes, setGeneratingCodes] = useState(false)
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)
  const [codesError, setCodesError] = useState('')
  const [codesCopied, setCodesCopied] = useState(false)

  // Security questions
  const [sqSet, setSqSet] = useState(false)
  const [sqStep, setSqStep] = useState('idle') // idle | editing | saving
  const [sqInputs, setSqInputs] = useState([{ question: '', answer: '' }, { question: '', answer: '' }, { question: '', answer: '' }])
  const [sqError, setSqError] = useState('')

  const loadStatus = useCallback(() => {
    fetch('/api/admin/mfa/status')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setEnabled(!!data.enabled)
        setRecoveryEmail(data.recoveryEmail || null)
        setCodesRemaining(data.recoveryCodesRemaining || 0)
        setSqSet(!!data.securityQuestionsSet)
      })
      .catch(() => setLoadError(true))
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  useEffect(() => {
    if (recoveryCooldown <= 0) return
    const id = setInterval(() => setRecoveryCooldown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(id)
  }, [recoveryCooldown])

  async function sendCode() {
    setError('')
    setStep('sending')
    try {
      const res = await fetch('/api/admin/mfa/send-code', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to send code.'); setStep('idle'); return }
      setStep('code')
      setCooldown(30)
    } catch {
      setError('Network error.')
      setStep('idle')
    }
  }

  async function verifyCode() {
    setError('')
    setStep('verifying')
    try {
      const res = await fetch('/api/admin/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Verification failed.'); setStep('code'); return }
      setEnabled(true)
      setStep('idle')
      setCode('')
    } catch {
      setError('Network error.')
      setStep('code')
    }
  }

  async function confirmDisable() {
    setDisabling(true)
    try {
      const res = await fetch('/api/admin/mfa/disable', { method: 'POST' })
      if (res.ok) { setEnabled(false); setShowDisableConfirm(false) }
      else setError('Failed to disable. Please try again.')
    } catch {
      setError('Network error.')
    } finally {
      setDisabling(false)
    }
  }

  async function sendRecoveryCode() {
    setRecoveryError('')
    setRecoveryStep('sending')
    try {
      const res = await fetch('/api/admin/mfa/recovery-email/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryInput }),
      })
      const data = await res.json()
      if (!res.ok) { setRecoveryError(data.error || 'Failed to send code.'); setRecoveryStep('editing'); return }
      setRecoveryStep('code')
      setRecoveryCooldown(30)
    } catch {
      setRecoveryError('Network error.')
      setRecoveryStep('editing')
    }
  }

  async function verifyRecoveryCode() {
    setRecoveryError('')
    setRecoveryStep('saving')
    try {
      const res = await fetch('/api/admin/mfa/recovery-email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryInput, code: recoveryCode }),
      })
      const data = await res.json()
      if (!res.ok) { setRecoveryError(data.error || 'Verification failed.'); setRecoveryStep('code'); return }
      setRecoveryEmail(data.recoveryEmail)
      setRecoveryStep('idle')
      setRecoveryInput(''); setRecoveryCode('')
    } catch {
      setRecoveryError('Network error.')
      setRecoveryStep('code')
    }
  }

  async function confirmRemoveRecovery() {
    setRemovingRecovery(true)
    try {
      const res = await fetch('/api/admin/mfa/recovery-email/remove', { method: 'POST' })
      if (res.ok) { setRecoveryEmail(null); setShowRemoveRecoveryConfirm(false) }
      else setRecoveryError('Failed to remove. Please try again.')
    } catch {
      setRecoveryError('Network error.')
    } finally {
      setRemovingRecovery(false)
    }
  }

  async function generateCodes() {
    setCodesError(''); setGeneratingCodes(true); setShowRegenConfirm(false)
    try {
      const res = await fetch('/api/admin/mfa/recovery-codes/generate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setCodesError(data.error || 'Failed to generate codes.'); return }
      setGeneratedCodes(data.codes || [])
      setCodesRemaining((data.codes || []).length)
    } catch {
      setCodesError('Network error.')
    } finally {
      setGeneratingCodes(false)
    }
  }

  async function saveSecurityQuestions() {
    setSqError('')
    if (sqInputs.some(x => x.question.trim().length < 3 || x.answer.trim().length < 2)) {
      setSqError('Fill in all three questions, each with an answer of at least 2 characters.'); return
    }
    setSqStep('saving')
    try {
      const res = await fetch('/api/admin/mfa/security-questions/set', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: sqInputs }),
      })
      const data = await res.json()
      if (!res.ok) { setSqError(data.error || 'Failed to save.'); setSqStep('editing'); return }
      setSqSet(true)
      setSqStep('idle')
      setSqInputs([{ question: '', answer: '' }, { question: '', answer: '' }, { question: '', answer: '' }])
    } catch {
      setSqError('Network error.')
      setSqStep('editing')
    }
  }

  return (
    <div style={CARD}>
      <div style={SECTION_LABEL}>Security</div>

      <ToggleSetting
        label="Two-Factor Login (Email Code)"
        description="When on, signing in to the admin panel requires a 6-digit code sent to your account email, in addition to your password."
        value={!!enabled}
        saving={enabled === null}
        onChange={v => {
          if (loadError) return
          if (v) sendCode()
          else setShowDisableConfirm(true)
        }}
      />

      {step === 'code' && (
        <div style={{ paddingBottom: '1.25rem', marginBottom: '1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '12px', color: '#888', fontFamily: 'var(--font-inter),sans-serif', lineHeight: 1.5, marginBottom: '0.65rem' }}>
            Enter the 6-digit code we just emailed you.
          </div>
          <input
            style={{ ...inp, marginBottom: '0.5rem', maxWidth: '160px', letterSpacing: '0.2em' }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
          />
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={verifyCode}
              disabled={code.length !== 6 || step === 'verifying'}
              style={{ padding: '0.4rem 1rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: code.length !== 6 ? 'default' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: code.length !== 6 ? 0.5 : 1 }}
            >
              {step === 'verifying' ? 'Verifying…' : 'Verify'}
            </button>
            <button
              type="button"
              onClick={sendCode}
              disabled={cooldown > 0}
              style={{ padding: '0.4rem 0.75rem', background: 'transparent', color: cooldown > 0 ? '#bbb' : '#666', border: 'none', fontSize: '11px', fontFamily: 'var(--font-inter),sans-serif', cursor: cooldown > 0 ? 'default' : 'pointer' }}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('idle'); setError(''); setCode('') }}
              style={{ padding: '0.4rem 0.75rem', background: 'transparent', color: '#888', border: 'none', fontSize: '11px', fontFamily: 'var(--font-inter),sans-serif', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <Err msg={error} />}
      {loadError && <Err msg="Could not load two-factor status." />}

      {enabled && (
        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', fontFamily: 'var(--font-inter),sans-serif', marginBottom: '0.25rem' }}>Recovery Email</div>
          <div style={{ fontSize: '12px', color: '#888', fontFamily: 'var(--font-inter),sans-serif', lineHeight: 1.5, marginBottom: '0.75rem' }}>
            If you ever lose access to your primary inbox, this backup address can receive your verification code instead.
          </div>

          {recoveryStep === 'idle' && (
            recoveryEmail ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: '#444', fontFamily: 'var(--font-inter),sans-serif' }}>{maskEmail(recoveryEmail)}</span>
                <button type="button" onClick={() => { setRecoveryStep('editing'); setRecoveryInput('') }}
                  style={{ background: 'none', border: 'none', fontSize: '11px', color: '#666', fontFamily: 'var(--font-inter),sans-serif', cursor: 'pointer', padding: 0 }}>
                  Change
                </button>
                <button type="button" onClick={() => setShowRemoveRecoveryConfirm(true)}
                  style={{ background: 'none', border: 'none', fontSize: '11px', color: '#93333E', fontFamily: 'var(--font-inter),sans-serif', cursor: 'pointer', padding: 0 }}>
                  Remove
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => { setRecoveryStep('editing'); setRecoveryInput('') }}
                style={{ padding: '0.4rem 1rem', background: 'transparent', color: '#666', border: '0.5px solid rgba(0,0,0,0.15)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                + Add recovery email
              </button>
            )
          )}

          {recoveryStep === 'editing' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                style={{ ...inp, maxWidth: '220px' }}
                type="email"
                value={recoveryInput}
                onChange={e => setRecoveryInput(e.target.value)}
                placeholder="backup@example.com"
                autoFocus
              />
              <button type="button" onClick={sendRecoveryCode} disabled={!recoveryInput.includes('@')}
                style={{ padding: '0.4rem 1rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: !recoveryInput.includes('@') ? 'default' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: !recoveryInput.includes('@') ? 0.5 : 1 }}>
                Send code
              </button>
              <button type="button" onClick={() => { setRecoveryStep('idle'); setRecoveryError('') }}
                style={{ background: 'none', border: 'none', fontSize: '11px', color: '#888', fontFamily: 'var(--font-inter),sans-serif', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          )}

          {(recoveryStep === 'sending') && (
            <div style={{ fontSize: '12px', color: '#888', fontFamily: 'var(--font-inter),sans-serif' }}>Sending code…</div>
          )}

          {(recoveryStep === 'code' || recoveryStep === 'saving') && (
            <div>
              <div style={{ fontSize: '12px', color: '#888', fontFamily: 'var(--font-inter),sans-serif', lineHeight: 1.5, marginBottom: '0.65rem' }}>
                Enter the 6-digit code sent to {recoveryInput}.
              </div>
              <input
                style={{ ...inp, marginBottom: '0.5rem', maxWidth: '160px', letterSpacing: '0.2em' }}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={recoveryCode}
                onChange={e => setRecoveryCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
              />
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={verifyRecoveryCode}
                  disabled={recoveryCode.length !== 6 || recoveryStep === 'saving'}
                  style={{ padding: '0.4rem 1rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: recoveryCode.length !== 6 ? 'default' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: recoveryCode.length !== 6 ? 0.5 : 1 }}
                >
                  {recoveryStep === 'saving' ? 'Saving…' : 'Verify'}
                </button>
                <button
                  type="button"
                  onClick={sendRecoveryCode}
                  disabled={recoveryCooldown > 0}
                  style={{ padding: '0.4rem 0.75rem', background: 'transparent', color: recoveryCooldown > 0 ? '#bbb' : '#666', border: 'none', fontSize: '11px', fontFamily: 'var(--font-inter),sans-serif', cursor: recoveryCooldown > 0 ? 'default' : 'pointer' }}
                >
                  {recoveryCooldown > 0 ? `Resend in ${recoveryCooldown}s` : 'Resend code'}
                </button>
                <button
                  type="button"
                  onClick={() => { setRecoveryStep('idle'); setRecoveryError(''); setRecoveryInput(''); setRecoveryCode('') }}
                  style={{ background: 'none', border: 'none', fontSize: '11px', color: '#888', fontFamily: 'var(--font-inter),sans-serif', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {recoveryError && <Err msg={recoveryError} />}

          {/* ── Recovery codes ─────────────────────────────────────────── */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', fontFamily: 'var(--font-inter),sans-serif', marginBottom: '0.25rem' }}>Recovery Codes</div>
            <div style={{ fontSize: '12px', color: '#888', fontFamily: 'var(--font-inter),sans-serif', lineHeight: 1.5, marginBottom: '0.75rem' }}>
              One-time codes to sign in if you can&rsquo;t get an email code. Save them in your password manager — each works once.
            </div>

            {generatedCodes ? (
              <div>
                <div style={{ fontSize: '11px', color: '#8A6535', background: 'rgba(197,168,130,0.1)', border: '0.5px solid rgba(197,168,130,0.4)', borderRadius: '6px', padding: '0.5rem 0.7rem', marginBottom: '0.65rem', lineHeight: 1.5 }}>
                  Save these now — they won&rsquo;t be shown again.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.35rem 0.75rem', marginBottom: '0.65rem' }}>
                  {generatedCodes.map((c, i) => (
                    <code key={i} style={{ fontFamily: 'monospace', fontSize: '13px', letterSpacing: '0.05em', color: '#1a1a1a', background: '#fafaf9', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '4px', padding: '4px 8px', textAlign: 'center' }}>{c}</code>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button type="button"
                    onClick={() => { try { navigator.clipboard.writeText(generatedCodes.join('\n')); setCodesCopied(true); setTimeout(() => setCodesCopied(false), 2000) } catch {} }}
                    style={{ padding: '0.4rem 1rem', background: 'transparent', color: '#666', border: '0.5px solid rgba(0,0,0,0.15)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                    {codesCopied ? '✓ Copied' : 'Copy all'}
                  </button>
                  <button type="button" onClick={() => setGeneratedCodes(null)}
                    style={{ padding: '0.4rem 1rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                    Done — I&rsquo;ve saved them
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: codesRemaining > 0 ? '#444' : '#999', fontFamily: 'var(--font-inter),sans-serif' }}>
                  {codesRemaining > 0 ? `${codesRemaining} unused code${codesRemaining === 1 ? '' : 's'} remaining` : 'No recovery codes yet'}
                </span>
                <button type="button" disabled={generatingCodes}
                  onClick={() => (codesRemaining > 0 ? setShowRegenConfirm(true) : generateCodes())}
                  style={{ padding: '0.4rem 1rem', background: 'transparent', color: '#666', border: '0.5px solid rgba(0,0,0,0.15)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: generatingCodes ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                  {generatingCodes ? 'Generating…' : codesRemaining > 0 ? 'Regenerate' : 'Generate codes'}
                </button>
              </div>
            )}
            {codesError && <Err msg={codesError} />}
          </div>

          {/* ── Security questions ─────────────────────────────────────── */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', fontFamily: 'var(--font-inter),sans-serif', marginBottom: '0.25rem' }}>Security Questions</div>
            <div style={{ fontSize: '12px', color: '#888', fontFamily: 'var(--font-inter),sans-serif', lineHeight: 1.5, marginBottom: '0.75rem' }}>
              Answer all three to sign in if you can&rsquo;t get an email code. Choose answers only you&rsquo;d know &mdash; not facts findable online.
            </div>

            {sqStep === 'editing' ? (
              <div>
                {sqInputs.map((x, i) => (
                  <div key={i} style={{ marginBottom: '0.6rem' }}>
                    <input style={{ ...inp, marginBottom: '0.35rem' }} value={x.question} maxLength={200} placeholder={`Question ${i + 1} (e.g. First concert you attended?)`}
                      onChange={e => setSqInputs(a => { const n = [...a]; n[i] = { ...n[i], question: e.target.value }; return n })} />
                    <input style={inp} value={x.answer} maxLength={200} placeholder="Answer"
                      onChange={e => setSqInputs(a => { const n = [...a]; n[i] = { ...n[i], answer: e.target.value }; return n })} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button type="button" onClick={saveSecurityQuestions} disabled={sqStep === 'saving'}
                    style={{ padding: '0.4rem 1rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: sqStep === 'saving' ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                    {sqStep === 'saving' ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" onClick={() => { setSqStep('idle'); setSqError('') }}
                    style={{ background: 'none', border: 'none', fontSize: '11px', color: '#888', fontFamily: 'var(--font-inter),sans-serif', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: sqSet ? '#3B6B2F' : '#999', fontFamily: 'var(--font-inter),sans-serif' }}>
                  {sqSet ? 'Security questions are set ✓' : 'Not set up'}
                </span>
                <button type="button"
                  onClick={() => { setSqInputs([{ question: '', answer: '' }, { question: '', answer: '' }, { question: '', answer: '' }]); setSqStep('editing'); setSqError('') }}
                  style={{ padding: '0.4rem 1rem', background: 'transparent', color: '#666', border: '0.5px solid rgba(0,0,0,0.15)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                  {sqSet ? 'Change' : 'Set up'}
                </button>
              </div>
            )}
            {sqError && <Err msg={sqError} />}
          </div>
        </div>
      )}

      {showRegenConfirm && (
        <ConfirmDialog
          title="Regenerate recovery codes?"
          message="Your existing recovery codes stop working immediately, and a new set is shown once."
          danger
          busy={generatingCodes}
          confirmLabel="Regenerate"
          onConfirm={generateCodes}
          onCancel={() => setShowRegenConfirm(false)}
        />
      )}

      {showDisableConfirm && (
        <ConfirmDialog
          title="Turn off two-factor login?"
          message="Your account will only need a password to sign in to the admin panel."
          danger
          busy={disabling}
          confirmLabel="Turn off"
          onConfirm={confirmDisable}
          onCancel={() => setShowDisableConfirm(false)}
        />
      )}

      {showRemoveRecoveryConfirm && (
        <ConfirmDialog
          title="Remove recovery email?"
          message="If you lose access to your primary inbox, you won't have a backup way to receive your verification code."
          danger
          busy={removingRecovery}
          confirmLabel="Remove"
          onConfirm={confirmRemoveRecovery}
          onCancel={() => setShowRemoveRecoveryConfirm(false)}
        />
      )}
    </div>
  )
}

export default function SettingsClient() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving]     = useState({})
  const [errors, setErrors]     = useState({})
  const [saved, setSaved]       = useState({})

  // Local draft state for text fields
  const [drafts, setDrafts] = useState({})

  const load = useCallback(() => {
    setLoadError(false)
    fetch('/api/admin/settings')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed')))
      .then(data => {
        setSettings(data)
        setDrafts({
          membership_closed_message: data.membership_closed_message || '',
          admin_banner:              data.admin_banner              || '',
          homepage_banner:           data.homepage_banner           || '',
          event_page_url:            data.event_page_url            || '',
        })
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function saveSetting(key, value) {
    setSaving(p => ({ ...p, [key]: true }))
    setErrors(p => ({ ...p, [key]: null }))
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      const data = await res.json()
      if (!res.ok) { setErrors(p => ({ ...p, [key]: data.error || 'Failed to save.' })); return }
      setSettings(p => ({ ...p, [key]: value }))
      setSaved(p => ({ ...p, [key]: true }))
      setTimeout(() => setSaved(p => ({ ...p, [key]: false })), 2000)
    } catch {
      setErrors(p => ({ ...p, [key]: 'Network error.' }))
    } finally {
      setSaving(p => ({ ...p, [key]: false }))
    }
  }

  function boolVal(key, fallback = true) {
    if (!(key in settings)) return fallback
    return settings[key] !== 'false'
  }

  function SavedIndicator({ k }) {
    return saved[k] ? <span style={{ fontSize: '11px', color: '#3B6B2F', marginLeft: '0.75rem', fontFamily: 'var(--font-inter),sans-serif' }}>✓ Saved</span> : null
  }

  if (loading) return (
    <div style={SECTION_STYLE}>
      <div style={{ fontSize: '13px', color: '#ccc' }}>Loading…</div>
    </div>
  )

  if (loadError) return (
    <div style={SECTION_STYLE}>
      <div style={{ background: 'rgba(147,51,62,0.06)', border: '0.5px solid rgba(147,51,62,0.2)', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '13px', color: '#93333E', fontFamily: 'var(--font-inter),sans-serif', marginBottom: '0.4rem' }}>Failed to load settings</div>
        <div style={{ fontSize: '12px', color: '#888', fontFamily: 'var(--font-inter),sans-serif' }}>Could not reach the settings API. Saving is disabled to prevent overwriting values with defaults.</div>
        <button onClick={load} style={{ marginTop: '0.75rem', padding: '0.35rem 0.9rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Retry</button>
      </div>
    </div>
  )

  return (
    <div style={SECTION_STYLE}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem', fontFamily: 'var(--font-inter),sans-serif' }}>Admin</div>
        <h1 style={{ fontSize: '22px', fontWeight: '400', color: '#1a1a1a', fontFamily: 'var(--font-inter),sans-serif', margin: 0 }}>Settings</h1>
      </div>

      {/* Membership */}
      <div style={CARD}>
        <div style={SECTION_LABEL}>Membership</div>

        <ToggleSetting
          label="Membership Applications Open"
          description="When off, the membership form shows a paused message before the payment step instead of accepting submissions."
          value={boolVal('membership_open', true)}
          saving={saving.membership_open}
          onChange={v => !loadError && saveSetting('membership_open', v ? 'true' : 'false')}
        />
        {errors.membership_open && <Err msg={errors.membership_open} />}
        <SavedIndicator k="membership_open" />

        <div style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
          <TextSetting
            label="Membership Closed Message"
            description="Shown when membership applications are off. Leave blank for the default."
            value={drafts.membership_closed_message}
            onChange={v => setDrafts(p => ({ ...p, membership_closed_message: v }))}
            onSave={() => saveSetting('membership_closed_message', drafts.membership_closed_message)}
            saving={saving.membership_closed_message}
            placeholder="Membership applications are currently paused. Check back soon."
            type="textarea"
          />
          {errors.membership_closed_message && <Err msg={errors.membership_closed_message} />}
          <SavedIndicator k="membership_closed_message" />
        </div>
      </div>

      <MfaCard />

      {/* Admin banner */}
      <div style={CARD}>
        <div style={SECTION_LABEL}>Admin Panel</div>
        <div style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
          <TextSetting
            label="Admin Banner"
            description="A notice shown at the top of every admin page. Leave blank to hide. Useful for reminders or alerts visible only to admins."
            value={drafts.admin_banner}
            onChange={v => setDrafts(p => ({ ...p, admin_banner: v }))}
            onSave={() => saveSetting('admin_banner', drafts.admin_banner)}
            saving={saving.admin_banner}
            placeholder="e.g. Event tomorrow — confirm final headcount in Contacts"
            type="textarea"
          />
          {errors.admin_banner && <Err msg={errors.admin_banner} />}
          <SavedIndicator k="admin_banner" />
        </div>
      </div>

      {/* Homepage */}
      <div style={CARD}>
        <div style={SECTION_LABEL}>Homepage</div>

        <TextSetting
          label="Announcement Banner"
          description="A short message shown as a public banner on the homepage — use it to announce upcoming events, registration openings, or news. Leave blank to hide the banner."
          value={drafts.homepage_banner}
          onChange={v => setDrafts(p => ({ ...p, homepage_banner: v }))}
          onSave={() => saveSetting('homepage_banner', drafts.homepage_banner)}
          saving={saving.homepage_banner}
          placeholder="e.g. New event July 19 — registration now open"
        />
        {errors.homepage_banner && <Err msg={errors.homepage_banner} />}
        <SavedIndicator k="homepage_banner" />

        <div style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
          <TextSetting
            label="Event Page URL"
            description="The URL the announcement banner links to. Set alongside the banner text. Can be an internal path (/cars-coffee-dad-jokes) or a full URL."
            value={drafts.event_page_url}
            onChange={v => setDrafts(p => ({ ...p, event_page_url: v }))}
            onSave={() => saveSetting('event_page_url', drafts.event_page_url)}
            saving={saving.event_page_url}
            placeholder="e.g. /next-event or https://canvasroutes.com/next-event"
          />
          {errors.event_page_url && <Err msg={errors.event_page_url} />}
          <SavedIndicator k="event_page_url" />
        </div>
      </div>

      {/* SQL reminder */}
      <div style={{ background: 'rgba(197,168,130,0.06)', border: '0.5px solid rgba(197,168,130,0.2)', padding: '1rem 1.25rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.4rem', fontFamily: 'var(--font-inter),sans-serif' }}>Supabase</div>
        <div style={{ fontSize: '12px', color: '#888', fontFamily: 'var(--font-inter),sans-serif', lineHeight: 1.6 }}>
          The <code style={{ background: 'rgba(0,0,0,0.05)', padding: '1px 4px', fontFamily: 'monospace' }}>settings</code> table must exist in your database.
          Run <code style={{ background: 'rgba(0,0,0,0.05)', padding: '1px 4px', fontFamily: 'monospace' }}>supabase/migrations/add_settings_table.sql</code> in the Supabase SQL Editor if settings don't save.
        </div>
      </div>
    </div>
  )
}
