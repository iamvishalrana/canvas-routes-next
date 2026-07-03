import { redirect } from 'next/navigation'

// This standalone waiver+lunch lookup predates the combined Trip Details +
// Waiver + Lunch dashboard at /wtet/checkin and has no way to collect
// passenger names — which per-person lunch now depends on. Not linked from
// anywhere in the app; redirect rather than maintain a second, incompatible
// flow.
export default async function WtetMyRegistrationRedirect({ searchParams }) {
  const params = await searchParams
  const email = typeof params?.email === 'string' ? params.email : ''
  redirect(email ? `/wtet/checkin?email=${encodeURIComponent(email)}` : '/wtet/checkin')
}
