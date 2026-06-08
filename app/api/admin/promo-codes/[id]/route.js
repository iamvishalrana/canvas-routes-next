import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { stripe } from '../../../../../lib/stripe.js'

export async function PATCH(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Not configured.' }, { status: 503 })

  const { id } = await params
  const updated = await stripe.promotionCodes.update(id, { active: false })
  return Response.json(updated)
}
