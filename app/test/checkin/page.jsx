'use client'
import SiteNav from '../../../components/SiteNav'
import SiteFooter from '../../../components/SiteFooter'
import CheckinTripDetailsSection from '../../../components/CheckinTripDetailsSection'
import CheckinWaiverSection from '../../../components/CheckinWaiverSection'
import CheckinLunchSection from '../../../components/CheckinLunchSection'
import { CHECKIN_T as t } from '../../../lib/genericCheckinContent'
import { HTM_WAIVER_TEXT, HTM_LUNCH_OPTIONS } from '../../../lib/htmAwardsWaiverContent'

// Static preview of the generic check-in page (/checkin/[eventId]) using
// Hello to Montebello's real config — same components a registrant sees,
// skipping the email-gate lookup. Forms will attempt to save against a fake
// eventId and fail silently; this is for visual review only, not a working
// demo submission.
export default function CheckinPreviewPage() {
  const identifier = { email: 'jordan@example.com', eventId: 'preview' }
  const firstName = 'Jordan'

  const samplePassengers = [
    { name: 'Jordan Whitfield', age: '34' },
    { name: 'Sam Whitfield', age: '31' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F5F1EC', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
      <SiteNav />

      <div style={{ background: '#0F1E14', padding: '0.6rem 1.5rem', textAlign: 'center' }}>
        <span style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c5a882' }}>
          Preview only — sample data, submissions won't save
        </span>
      </div>

      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>
        <div className="wtetci-fade-up" style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>
            Hello to Montebello — 2026
          </div>
          <h1 style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '2.2rem', fontWeight: '300', color: '#0F1E14', margin: '0 0 0.5rem', lineHeight: '1.2' }}>
            {t.hiName(firstName)}
          </h1>
          <div style={{ width: '30px', height: '0.5px', background: '#c5a882', margin: '1.25rem 0' }} />
          <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.8', margin: 0 }}>
            {t.incompleteMsg}
          </p>
        </div>

        <CheckinTripDetailsSection
          identifier={identifier}
          alreadyCompleted={false}
          initialPassengerCount={2}
          maxPassengers={2}
          onSaved={() => {}}
        />

        <div style={{ height: '1.75rem' }} />

        <CheckinWaiverSection
          waiverText={HTM_WAIVER_TEXT}
          identifier={identifier}
          waiver={null}
          carYear="2022"
          carMake="Porsche"
          carModel="911"
          maxPassengers={2}
          onSaved={() => {}}
        />

        <div style={{ height: '1.75rem' }} />

        <CheckinLunchSection
          identifier={identifier}
          lunch={null}
          lunchOptions={HTM_LUNCH_OPTIONS}
          lunchCutoff={null}
          lunchLocked={false}
          passengersList={samplePassengers}
          tripDone={true}
          onSaved={() => {}}
        />
      </main>

      <SiteFooter />
      <style>{`
        @keyframes wtetci-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes wtetci-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes wtetci-pop { 0% { transform: scale(0.9); opacity: 0.6; } 60% { transform: scale(1.06); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes wtetci-shimmer { 0% { left: -80%; opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { left: 130%; opacity: 0; } }

        .wtetci-fade-up { animation: wtetci-fade-up 0.55s ease both; }
        .wtetci-fade-in { animation: wtetci-fade-in 0.35s ease both; }

        .wtetci-btn-primary { box-shadow: 0 2px 6px rgba(15,30,20,0.22); transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .wtetci-btn-primary:active:not(:disabled) { transform: translateY(0); box-shadow: 0 2px 6px rgba(15,30,20,0.22); }
        .wtetci-btn-ghost { transition: box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease; }
        .wtetci-input { transition: box-shadow 0.15s ease, border-color 0.15s ease; }
        .wtetci-input:focus { border-color: rgba(197,168,130,0.75) !important; box-shadow: 0 0 0 3px rgba(197,168,130,0.18); }
        .wtetci-card { transition: box-shadow 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .wtetci-dish { transition: box-shadow 0.15s ease; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
        .wtetci-dish-selected { box-shadow: 0 4px 14px rgba(197,168,130,0.28) !important; }
        .wtetci-pill-pop { animation: wtetci-pop 0.45s ease; }

        .wtetci-cta { position: relative; overflow: hidden; }
        .wtetci-cta::after {
          content: ''; position: absolute; top: -10%; left: -80%; width: 40%; height: 120%;
          background: linear-gradient(105deg, transparent 10%, rgba(255,255,255,0.28) 50%, transparent 90%);
          transform: skewX(-10deg);
          animation: wtetci-shimmer 1s cubic-bezier(0.4,0,0.2,1) 0.6s forwards;
          pointer-events: none;
        }

        @media (hover: hover) {
          .wtetci-btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(15,30,20,0.28); }
          .wtetci-btn-ghost:hover:not(:disabled) { box-shadow: 0 3px 10px rgba(0,0,0,0.08); transform: translateY(-1px); border-color: rgba(0,0,0,0.3); }
          .wtetci-card:hover { box-shadow: 0 6px 16px rgba(0,0,0,0.08); }
          .wtetci-dish:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.07); }
        }
      `}</style>
    </div>
  )
}
