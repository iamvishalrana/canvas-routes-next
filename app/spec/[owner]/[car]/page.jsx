'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import QRCode from 'react-qr-code'
import { getCar } from '../../../../lib/specData'
import { notFound } from 'next/navigation'

export default function SpecSheet({ params }) {
  const { owner, car } = params
  const data = getCar(owner, car)
  if (!data) notFound()

  const [url, setUrl] = useState('')
  useEffect(() => { setUrl(window.location.href) }, [])

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #F5F1EC;
          font-family: var(--font-inter), Arial, sans-serif;
          color: #1a1a1a;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .spec-page {
          max-width: 820px;
          margin: 0 auto;
          padding: 3rem 3.5rem 4rem;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .spec-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2.5rem;
          padding-bottom: 2rem;
          border-bottom: 0.5px solid rgba(0,0,0,0.1);
        }

        .spec-logo {
          width: 130px;
          height: auto;
          display: block;
        }

        .spec-event-label {
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #c5a882;
          text-align: right;
          line-height: 1.7;
        }

        .spec-car-heading {
          margin-bottom: 2.5rem;
        }

        .spec-owner-name {
          font-family: var(--font-cormorant), Georgia, serif;
          font-size: clamp(2.4rem, 5vw, 3.8rem);
          font-weight: 300;
          color: #1a1a1a;
          line-height: 1.0;
          letter-spacing: -0.01em;
        }

        .spec-car-year {
          font-family: var(--font-cormorant), Georgia, serif;
          font-size: clamp(2.4rem, 5vw, 3.8rem);
          font-weight: 300;
          color: #c5a882;
          line-height: 1.0;
          letter-spacing: -0.01em;
        }

        .spec-car-name {
          font-family: var(--font-cormorant), Georgia, serif;
          font-size: clamp(1.6rem, 3vw, 2.2rem);
          font-weight: 300;
          color: #444;
          line-height: 1.2;
          margin-top: 0.35rem;
          letter-spacing: -0.01em;
        }

        .spec-divider {
          width: 40px;
          height: 0.5px;
          background: #c5a882;
          margin: 1.5rem 0;
        }

        .spec-note {
          font-family: var(--font-cormorant), Georgia, serif;
          font-size: 1.15rem;
          font-style: italic;
          color: #666;
          line-height: 1.7;
          margin-bottom: 2.5rem;
          max-width: 480px;
        }

        .spec-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0;
          border: 0.5px solid rgba(0,0,0,0.1);
          margin-bottom: 2.5rem;
        }

        .spec-cell {
          padding: 1rem 1.25rem;
          border-right: 0.5px solid rgba(0,0,0,0.08);
          border-bottom: 0.5px solid rgba(0,0,0,0.08);
        }

        .spec-cell:nth-child(even) { border-right: none; }

        .spec-cell-full {
          grid-column: 1 / -1;
          border-right: none;
        }

        .spec-cell-label {
          font-size: 9px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #c5a882;
          margin-bottom: 0.3rem;
        }

        .spec-cell-value {
          font-size: 14px;
          color: #1a1a1a;
          font-weight: 400;
          line-height: 1.4;
        }

        .spec-lower-section {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .spec-footer {
          margin-top: auto;
          padding-top: 1.5rem;
          border-top: 0.5px solid rgba(0,0,0,0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .spec-footer-left {
          font-size: 10px;
          letter-spacing: 0.05em;
          color: #aaa;
          line-height: 1.8;
        }

        /* Screen: hide QR block, show membership CTA */
        .spec-qr-centered { display: none; }
        .spec-membership-cta { display: block; }

        /* ── Print ──────────────────────────────────────────────── */
        @page {
          size: A4;
          margin: 0;
        }

        @media print {
          .cookie-banner { display: none !important; }

          html, body, body > div {
            margin: 0 !important;
            padding: 0 !important;
            height: 297mm !important;
            max-height: 297mm !important;
            overflow: hidden !important;
          }

          /* Suppress browser-printed link URLs */
          a[href]::after, a::after { content: none !important; }

          .spec-page {
            width: 210mm;
            height: 297mm;
            padding: 9mm 13mm;
            box-sizing: border-box;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }

          /* Logo: centered */
          .spec-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 0.4rem;
            margin-bottom: 1.4rem;
            padding-bottom: 1rem;
          }
          .spec-logo { width: 220px !important; }
          .spec-event-label { text-align: center; font-size: 9px; }

          /* Heading */
          .spec-car-heading { margin-bottom: 0.9rem; }
          .spec-owner-name { font-size: 2.8rem; }
          .spec-car-year   { font-size: 2.8rem; }
          .spec-car-name   { font-size: 1.35rem; margin-top: 0.2rem; }

          /* Divider + note */
          .spec-divider { margin: 0.7rem 0; }
          .spec-note { margin-bottom: 1rem; font-size: 0.95rem; line-height: 1.6; }

          /* Specs grid */
          .spec-grid { margin-bottom: 1.2rem; }
          .spec-cell { padding: 0.55rem 1rem; }
          .spec-cell-label { font-size: 8.5px; }
          .spec-cell-value { font-size: 13px; }

          /* Lower section: push footer + QR to bottom */
          .spec-lower-section { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; }

          /* Footer */
          .spec-footer { padding-top: 0.8rem; margin-top: 0; }
          .spec-membership-cta { display: none !important; }

          /* QR: full-width centered block */
          .spec-qr-centered {
            display: flex !important;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100%;
            gap: 0.4rem;
            padding-top: 1rem;
          }
        }

        @media (max-width: 600px) {
          .spec-page { padding: 2rem 1.5rem 3rem; }
          .spec-grid { grid-template-columns: 1fr; }
          .spec-cell { border-right: none; }
          .spec-cell:nth-child(even) { border-right: none; }
        }
      `}</style>

      <div className="spec-page">

        {/* Header */}
        <div className="spec-header">
          <img src="/canvas_routes_refined.png" alt="Canvas Routes" className="spec-logo" />
          <div className="spec-event-label">
            Grand Prix Weekend · May 23, 2026 · Montreal, QC
          </div>
        </div>

        {/* Car heading */}
        <div className="spec-car-heading">
          <div className="spec-owner-name">{data.displayName}&apos;s</div>
          <div className="spec-car-year">{data.year}</div>
          <div className="spec-car-name">{data.make} {data.model}</div>
        </div>

        <div className="spec-divider" />

        {data.note && <div className="spec-note">&ldquo;{data.note}&rdquo;</div>}

        {/* Specs grid */}
        <div className="spec-grid">
          {data.specs.map((s, i) => (
            <div key={i} className="spec-cell">
              <div className="spec-cell-label">{s.label}</div>
              <div className="spec-cell-value">{s.value}</div>
            </div>
          ))}
          {data.color && (
            <div className="spec-cell">
              <div className="spec-cell-label">Color</div>
              <div className="spec-cell-value">{data.color}</div>
            </div>
          )}
          {data.mods && (
            <div className="spec-cell spec-cell-full">
              <div className="spec-cell-label">Modifications / Speciality</div>
              <div className="spec-cell-value" style={{ color: '#555', fontWeight: 400 }}>{data.mods}</div>
            </div>
          )}
        </div>

        {/* Footer section */}
        <div className="spec-lower-section">

          {/* Footer */}
          <div className="spec-footer">
            <div className="spec-footer-left">
              © 2026 Canvas Routes · canvasroutes.com
            </div>
            <div className="spec-membership-cta">
              <Link href="/routes" style={{
                display: 'inline-block',
                padding: '0.7rem 1.6rem',
                background: '#0F1E14',
                color: '#c5a882',
                fontSize: '10px',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                fontFamily: 'var(--font-inter), Arial, sans-serif',
                border: '0.5px solid rgba(197,168,130,0.4)',
              }}>
                Join Membership
              </Link>
            </div>
          </div>

          {/* Print only: QR code centered below footer */}
          <div className="spec-qr-centered">
            {url && <QRCode value={url} size={96} fgColor="#1a1a1a" bgColor="#F5F1EC" />}
            <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>
              Scan to view
            </div>
          </div>

        </div>

      </div>
    </>
  )
}
