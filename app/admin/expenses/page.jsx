import { requireAdmin } from '../../../lib/supabase/authCheck'
import { redirect } from 'next/navigation'
import ExpensesClient from './ExpensesClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Expenses — Admin' }

export default async function ExpensesPage() {
  if (!await requireAdmin()) redirect('/admin')
  return <ExpensesClient />
}
