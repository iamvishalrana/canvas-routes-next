import { redirect } from 'next/navigation'

// Friendly short link for the September 5, 2026 Cars & Coffee meet —
// registration itself lives at the generic /meet/[id] page.
export default function CarsCoffeeSept2026Redirect() {
  redirect('/meet/1a020f09-f618-42ed-b646-75c1927da38a')
}
