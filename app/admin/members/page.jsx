import { createAdminClient } from '../../../lib/supabase/admin'
import MembersClient from './MembersClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Members — Admin' }

const PAGE_SIZE = 50
const SORT_COLUMNS = {
  // membership_number is stored zero-padded (see lib/memberNumber.js) so a
  // plain column sort is already correct numeric order, not lexicographic.
  member_num_asc:  { column: 'membership_number', ascending: true },
  member_num_desc: { column: 'membership_number', ascending: false },
  name_az:  { column: 'name', ascending: true },
  name_za:  { column: 'name', ascending: false },
  oldest:   { column: 'created_at', ascending: true },
  newest:   { column: 'created_at', ascending: false },
}

export default async function MembersPage({ searchParams }) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1'))
  const q = (params.q || '').trim()
  const status = params.status || ''
  const tier = params.tier || ''
  // Members section always opens sorted by membership number, lowest first —
  // the standing default, not just an option in the dropdown.
  const sortKey = SORT_COLUMNS[params.sort] ? params.sort : 'member_num_asc'
  const offset = (page - 1) * PAGE_SIZE

  const supabase = createAdminClient()
  let query = supabase.from('members').select('*', { count: 'exact' })
  if (q) {
    // Strip characters with special meaning in PostgREST's .or() filter
    // syntax so a search string can't break out into an unintended filter
    const safeQ = q.replace(/[,()]/g, ' ').trim()
    if (safeQ) query = query.or(`name.ilike.%${safeQ}%,email.ilike.%${safeQ}%,phone.ilike.%${safeQ}%,instagram.ilike.%${safeQ}%,car_make.ilike.%${safeQ}%,car_model.ilike.%${safeQ}%`)
  }
  if (status) query = query.eq('membership_status', status)
  if (tier) query = query.eq('tier', tier)

  const { column, ascending } = SORT_COLUMNS[sortKey]

  const [{ data: members, count }, { data: statRows }] = await Promise.all([
    query.order(column, { ascending }).range(offset, offset + PAGE_SIZE - 1),
    // Global status/tier counts — the client previously counted only the
    // current page, which under-reported once there was more than one page
    supabase.from('members').select('membership_status, tier'),
  ])

  const statusCounts = { active: 0, pending: 0, suspended: 0, expired: 0, inner_circle: 0 }
  for (const r of statRows || []) {
    if (statusCounts[r.membership_status] !== undefined) statusCounts[r.membership_status]++
    if (r.tier === 'inner_circle') statusCounts.inner_circle++
  }

  return (
    <MembersClient
      initialMembers={members || []}
      total={count || 0}
      page={page}
      pageSize={PAGE_SIZE}
      statusCounts={statusCounts}
    />
  )
}
