import { createClient } from './server.js'
import { isAdminUser } from '../adminAccess.js'

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function requireAdmin() {
  const user = await getUser()
  return isAdminUser(user) ? user : null
}
