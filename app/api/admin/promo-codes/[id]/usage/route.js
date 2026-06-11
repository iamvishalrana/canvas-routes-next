import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { stripe } from '../../../../../../lib/stripe.js'
import { captureException } from '../../../../../../lib/sentry.js'

export async function GET(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Not configured.' }, { status: 503 })

  const { id } = await params

  try {
    // Fetch all succeeded PIs and filter by promo_code_id metadata
    const allPIs = await stripe.paymentIntents.list({ expand: ['data.latest_charge'] }).autoPagingToArray({ limit: 2000 })
    const used = allPIs
      .filter(pi => pi.status === 'succeeded' && pi.metadata?.promo_code_id === id)
      .map(pi => {
        const charge = pi.latest_charge
        return {
          name:     pi.metadata.name || '—',
          email:    pi.metadata.email?.toLowerCase().trim() || '',
          type:     pi.metadata.type || '',
          amount:   pi.amount_received,
          discount: pi.metadata.discount_amount ? parseInt(pi.metadata.discount_amount, 10) : 0,
          date:     (charge && typeof charge === 'object' && charge.created)
            ? new Date(charge.created * 1000).toISOString()
            : new Date(pi.created * 1000).toISOString(),
        }
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    return Response.json(used)
  } catch (err) {
    captureException(err, { context: 'promo-code-usage', id })
    return Response.json({ error: 'Failed to fetch usage.' }, { status: 500 })
  }
}
