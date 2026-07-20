// Flat Quebec sales tax applied to every Canvas Routes payment (membership +
// all routes/events) — no customer address is collected, which is the CRA
// place-of-supply default: events are supplied where they happen (Quebec),
// and services with no address on file default to the supplier's own
// province (also Quebec). GST and QST are each computed independently on
// the pre-tax subtotal, never compounded — matches Revenu Québec's method
// since Jan 1 2013.
export const GST_RATE = 0.05
export const QST_RATE = 0.09975

// subtotalCents: pre-tax amount in cents. Returns all fields in cents.
export function computeTax(subtotalCents) {
  const gst = Math.round(subtotalCents * GST_RATE)
  const qst = Math.round(subtotalCents * QST_RATE)
  return { subtotal: subtotalCents, gst, qst, tax: gst + qst, total: subtotalCents + gst + qst }
}
