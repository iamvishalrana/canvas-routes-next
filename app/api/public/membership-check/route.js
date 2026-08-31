import { createAdminClient } from '../../../../lib/supabase/admin.js'
import { isValidEmail } from '../../../../lib/emailValidation'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')?.toLowerCase().trim()
  if (!email || !isValidEmail(email)) {
    return Response.json({ hasApplication: false })
  }
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('applications')
      .select('stripe_payment_status')
      .eq('email', email)
      .in('stripe_payment_status', ['authorized', 'paid'])
      .maybeSingle()
    return Response.json({ hasApplication: !!data })
  } catch {
    return Response.json({ hasApplication: false })
  }
}
