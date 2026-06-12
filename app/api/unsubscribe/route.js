import { createAdminClient } from '../../../lib/supabase/admin'

export async function POST(request) {
  let email
  try {
    const body = await request.json()
    email = body.email?.toLowerCase().trim()
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (!email || !email.includes('@')) {
    return Response.json({ error: 'Invalid email.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('unsubscribed_emails')
    .upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })

  if (error) {
    return Response.json({ error: 'Could not process your request.' }, { status: 500 })
  }

  return Response.json({ success: true })
}

export async function GET(request) {
  const email = new URL(request.url).searchParams.get('email')?.toLowerCase().trim()
  if (!email) return Response.json({ unsubscribed: false })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('unsubscribed_emails')
    .select('email')
    .eq('email', email)
    .maybeSingle()

  return Response.json({ unsubscribed: !!data })
}
