// Deliberately unlisted — this page is not yet linked from anywhere on the
// site (nav, homepage, /routes) and must not be surfaced by search until
// that changes. noindex is the correct mechanism here (vs. robots.txt
// disallow, which would also block crawling and hide any future inbound
// links' context) since the page has zero other discovery paths right now.
//
// Only `title` is set below — a real browser-tab title costs nothing (it
// doesn't affect indexing or link-preview discoverability) but no OG/
// description/JSON-LD yet, since adding those would make the page's content
// visible the moment anyone pastes the link anywhere, ahead of launch.
// Same treatment as app/cbtd-2026/layout.jsx.
export const metadata = {
  title: 'Circuit Mont-Tremblant — Track Day — 2026',
  robots: { index: false, follow: false },
}

export default function CmtLayout({ children }) {
  return (
    <>
      {/* Polyfill for in-app browsers where native-bridge calls throw on
          window.webkit.messageHandlers[someHandler].postMessage(...) — Stripe.js's
          Apple Pay availability check hits this. Instagram doesn't define
          window.webkit at all; Facebook DOES define window.webkit.messageHandlers,
          but its own injected in-app-browser instrumentation sometimes calls a
          handler key that isn't actually registered, throwing on
          undefined.postMessage. This page uses PaymentElement with Apple Pay
          enabled (same as /wtet and /hello-to-montebello, both of which needed
          this same fix), so it has the same exposure. Wrapping messageHandlers
          itself in a Proxy (rather than only creating it when entirely absent)
          covers both cases — real handlers still work via the `in target`
          check, anything else falls back to a no-op instead of crashing. */}
      <script dangerouslySetInnerHTML={{ __html: `
        try {
          if (!window.webkit) {
            window.webkit = {};
          }
          var existingHandlers = window.webkit.messageHandlers || {};
          window.webkit.messageHandlers = new Proxy(existingHandlers, {
            get: function(target, prop) {
              if (prop in target) return target[prop];
              return { postMessage: function() {} };
            }
          });
        } catch(e) {}
      `}} />
      {children}
    </>
  )
}
