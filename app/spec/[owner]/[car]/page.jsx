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

        .spec-car-name {
          font-family: var(--font-cormorant), Georgia, serif;
          font-size: clamp(1.6rem, 3vw, 2.2rem);
          font-weight: 300;
          color: #444;
          line-height: 1.2;
          margin-top: 0.35rem;
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

        .spec-cell:nth-child(even) {
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

        .spec-footer {
          margin-top: auto;
          padding-top: 2rem;
          border-top: 0.5px solid rgba(0,0,0,0.1);
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .spec-footer-left {
          font-size: 10px;
          letter-spacing: 0.05em;
          color: #aaa;
          line-height: 1.8;
        }

        /* Screen: hide QR, show membership CTA */
        .spec-qr-block { display: none; }
        .spec-membership-cta { display: block; }

        .spec-mods {
          border: 0.5px solid rgba(0,0,0,0.1);
          margin-bottom: 2.5rem;
        }

        .spec-mods-header {
          padding: 0.75rem 1.25rem;
          border-bottom: 0.5px solid rgba(0,0,0,0.08);
          font-size: 9px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #c5a882;
        }

        .spec-mods-body {
          padding: 1rem 1.25rem;
          min-height: 80px;
          font-size: 13px;
          color: #555;
          line-height: 1.7;
        }

        .spec-mods-lines {
          display: none;
        }

        /* Print: show QR, hide membership CTA */
        @media print {
          .spec-page { padding: 1.8rem 2.5rem 2.5rem; }
          .spec-membership-cta { display: none !important; }
          .spec-qr-block { display: flex !important; }
          .spec-owner-name { font-size: 2.6rem; }
          .spec-car-year { font-size: 2.6rem; }
          .spec-car-name { font-size: 1.5rem; }
          .spec-mods-body { display: none; }
          .spec-mods-lines { display: block; }
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
            Cars, Coffee &amp; Cruise<br />
            Grand Prix Weekend · May 23, 2026<br />
            Montreal, QC
          </div>
        </div>

        {/* Car heading */}
        <div className="spec-car-heading">
          <div className="spec-car-year">{data.year}</div>
          <div className="spec-owner-name">{data.displayName}&apos;s</div>
          <div className="spec-car-name">{data.make} {data.model}{data.color ? ` · ${data.color}` : ''}</div>
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
        </div>

        {/* Modifications */}
        <div className="spec-mods">
          <div className="spec-mods-header">Modifications</div>
          <div className="spec-mods-body">
            {data.mods ? data.mods : <span style={{ color: '#bbb', fontStyle: 'italic' }}>—</span>}
          </div>
          {/* Print: blank lines to write on */}
          <div className="spec-mods-lines" style={{ padding: '0.75rem 1.25rem 1.5rem' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.15)', height: '2rem', marginBottom: '0.25rem' }} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="spec-footer">
          <div className="spec-footer-left">
            © 2026 Canvas Routes<br />
            canvasroutes.com
          </div>

          {/* Screen only: membership CTA */}
          <div className="spec-membership-cta">
            <Link href="/membership" style={{
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

          {/* Print only: QR code */}
          <div className="spec-qr-block" style={{ flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            {url && <QRCode value={url} size={80} fgColor="#1a1a1a" bgColor="#F5F1EC" />}
            <div style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#aaa', textAlign: 'center' }}>
              Scan to view
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
