// Draft/placeholder build — date and venue not yet confirmed. Deliberately
// unlisted (not linked from nav, homepage, or /routes) and must not be
// surfaced by search until Jerry confirms it's ready. noindex is the correct
// mechanism here (vs. robots.txt disallow, which would also block crawling
// and hide any future inbound links' context) since the page has zero other
// discovery paths right now — same pattern as /cbtd-2026 before launch.
export const metadata = {
  robots: { index: false, follow: false },
}

export default function SundaySilhouetteLayout({ children }) {
  return (
    <>
      {/* Polyfill for in-app browsers where native-bridge calls throw on
          window.webkit.messageHandlers[someHandler].postMessage(...) — Stripe.js's
          Apple Pay availability check hits this. Instagram doesn't define
          window.webkit at all; Facebook DOES define window.webkit.messageHandlers,
          but its own injected in-app-browser instrumentation sometimes calls a
          handler key that isn't actually registered, throwing on
          undefined.postMessage. This page uses PaymentElement with Apple Pay
          enabled (same as /wtet, /hello-to-montebello, and /cbtd-2026), so it
          has the same exposure. Wrapping messageHandlers itself in a Proxy
          (rather than only creating it when entirely absent) covers both
          cases — real handlers still work via the `in target` check, anything
          else falls back to a no-op instead of crashing. */}
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
