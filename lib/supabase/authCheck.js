import { createClient } from './server.js'

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function requireAdmin() {
  const user = await getUser()
  if (!user) return null
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
  return adminEmails.includes(user.email) ? user : null
}
