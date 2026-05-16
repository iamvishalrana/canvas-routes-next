import { createClient } from '../../../../lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const origin = new URL(request.url).origin
  return NextResponse.redirect(new URL('/members/login', origin), { status: 302 })
}
