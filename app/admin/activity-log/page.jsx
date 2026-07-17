import { createAdminClient } from '../../../lib/supabase/admin'
import ActivityLogClient from './ActivityLogClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Activity Log — Admin' }

export default async function ActivityLogPage() {
  const supabase = createAdminClient()
  const { data: logs } = await supabase
    .from('admin_activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  return <ActivityLogClient logs={logs || []} />
}
