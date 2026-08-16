import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../lib/adminAudit.js'
import { stripe } from '../../../../lib/stripe.js'
import { captureException } from '../../../../lib/sentry.js'

// One-off Stripe Payment Links, created and managed from the admin panel — for
// merch, a last-minute add-on, or a sponsor invoice, without building a page.
// A link is a Product + Price + PaymentLink; the resulting charge carries
// metadata.type 'payment_link' so it also surfaces in the Payments list.
//
// Stripe is the source of truth (no local table): the list reads back from
// stripe.paymentLinks.list, and label/amount are stored in each link's metadata
// so the list is cheap to render without expanding line items per link.

const CURRENCY = 'cad'
const STRIPE_MIN_CENTS = 50 // Stripe rejects charges under $0.50 CAD

// Shape a Stripe PaymentLink into the compact record the client renders. Amount
// and label live in metadata (written at creation); fall back gracefully for
// links created outside this tool.
function toRecord(link) {
  const cents = parseInt(link.metadata?.amount_cents || '', 10)
  return {
    id: link.id,
    url: link.url,
    active: link.active,
    label: link.metadata?.label || '(untitled)',
    amount_cents: Number.isFinite(cents) ? cents : null,
    currency: (link.currency || CURRENCY).toUpperCase(),
    adjustable_quantity: !!link.metadata?.adjustable_quantity,
    created: link.created ? new Date(link.created * 1000).toISOString() : null,
  }
}

export async function GET() {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Stripe is not configured.' }, { status: 503 })
  try {
    // Newest first (Stripe returns creation-descending). Cap at 100 — this is a
    // low-volume admin tool, not a customer-facing catalogue.
    const links = await stripe.paymentLinks.list({ limit: 100 })
    return Response.json(links.data.map(toRecord))
  } catch (e) {
    captureException(e, { context: 'admin-payment-links-list' })
    return Response.json({ error: e.message || 'Failed to load payment links.' }, { status: 500 })
  }
}

export async function POST(request) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Stripe is not configured.' }, { status: 503 })

  const body = await request.json().catch(() => ({}))
  const label = (body.label || '').trim()
  const amountCents = Math.round(Number(body.amountDollars) * 100)
  const adjustableQuantity = !!body.adjustableQuantity

  if (!label) return Response.json({ error: 'A name is required.' }, { status: 400 })
  if (!Number.isFinite(amountCents) || amountCents < STRIPE_MIN_CENTS) {
    return Response.json({ error: `Amount must be at least $${(STRIPE_MIN_CENTS / 100).toFixed(2)}.` }, { status: 400 })
  }
  if (amountCents > 99999999) return Response.json({ error: 'Amount is too large.' }, { status: 400 })

  try {
    // Each link is its own throwaway Product + Price (Payment Links require a
    // Price, not an ad-hoc amount). Not reused across links so editing/archiving
    // one never affects another.
    const product = await stripe.products.create({
      name: label.slice(0, 250),
      metadata: { source: 'admin_payment_link', created_by: adminUser.email || '' },
    })
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: amountCents,
      currency: CURRENCY,
    })
    const link = await stripe.paymentLinks.create({
      line_items: [{
        price: price.id,
        quantity: 1,
        ...(adjustableQuantity ? { adjustable_quantity: { enabled: true, minimum: 1, maximum: 99 } } : {}),
      }],
      // Stamp the resulting charge so it appears in the admin Payments list
      // (which filters PaymentIntents by metadata.type) and reconciles cleanly.
      payment_intent_data: { metadata: { type: 'payment_link', label } },
      metadata: {
        label,
        amount_cents: String(amountCents),
        adjustable_quantity: adjustableQuantity ? '1' : '',
        created_by: adminUser.email || '',
      },
    })

    const supabase = createAdminClient()
    await logAdminAction(supabase, adminUser?.email, {
      action: 'payment_link.create', entityType: 'payment_link', entityId: link.id, entityName: label,
      metadata: { amount_cents: amountCents },
    })
    return Response.json(toRecord(link))
  } catch (e) {
    captureException(e, { context: 'admin-payment-links-create', label })
    return Response.json({ error: e.message || 'Failed to create payment link.' }, { status: 500 })
  }
}

// Activate / deactivate. Stripe payment links can't be deleted, only toggled —
// deactivating stops the URL from accepting new payments.
export async function PATCH(request) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Stripe is not configured.' }, { status: 503 })

  const { id, active } = await request.json().catch(() => ({}))
  if (!id || typeof active !== 'boolean') {
    return Response.json({ error: 'Link id and active state are required.' }, { status: 400 })
  }
  try {
    const link = await stripe.paymentLinks.update(id, { active })
    const supabase = createAdminClient()
    await logAdminAction(supabase, adminUser?.email, {
      action: active ? 'payment_link.activate' : 'payment_link.deactivate',
      entityType: 'payment_link', entityId: id, entityName: link.metadata?.label || null,
    })
    return Response.json(toRecord(link))
  } catch (e) {
    captureException(e, { context: 'admin-payment-links-toggle', id })
    return Response.json({ error: e.message || 'Failed to update payment link.' }, { status: 500 })
  }
}
