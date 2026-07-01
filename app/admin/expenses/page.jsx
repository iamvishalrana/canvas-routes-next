import ExpensesClient from './ExpensesClient'

export const metadata = { title: 'Expenses — Admin' }

// Auth is already enforced by middleware.js — no need to re-check here.
// No per-request data of its own (ExpensesClient fetches client-side), so this page
// doesn't need force-dynamic either.
export default function ExpensesPage() {
  return <ExpensesClient />
}
