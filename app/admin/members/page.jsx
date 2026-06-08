import { createAdminClient } from '../../../lib/supabase/admin'
import MembersClient from './MembersClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Members — Admin' }

const PAGE_SIZE = 50

export default async function MembersPage({ searchParams }) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1'))
  const q = params.q || ''
  const status = params.status || ''
  const offset = (page - 1) * PAGE_SIZE

  const supabase = createAdminClient()
  let query = supabase.from('members').select('*', { count: 'exact' })
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`)
  if (status) query = query.eq('membership_status', status)

  const { data: members, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  return (
    <MembersClient
      initialMembers={members || []}
      total={count || 0}
      page={page}
      pageSize={PAGE_SIZE}
    />
  )
}
