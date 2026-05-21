const RESEND_API_KEY = process.env.RESEND_API_KEY

async function fetchAllEmails() {
  const emails = []
  let page = 1
  while (true) {
    const res = await fetch(`https://api.resend.com/emails?limit=100&page=${page}`, {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    })
    if (!res.ok) { console.error('List error:', await res.text()); break }
    const data = await res.json()
    const batch = data.data ?? data.emails ?? []
    if (!batch.length) break
    emails.push(...batch)
    if (batch.length < 100) break
    page++
    await new Promise(r => setTimeout(r, 300))
  }
  return emails
}

async function main() {
  const all = await fetchAllEmails()
  console.log('Total:', all.length)

  const notifications = all.filter(e =>
    e.subject?.includes('New application') &&
    (Array.isArray(e.to) ? e.to.join('') : e.to || '').includes('info@canvasroutes.com')
  )
  console.log('Notification emails:', notifications.length)

  // Show unique subjects to understand formats
  const subjects = [...new Set(notifications.map(e => e.subject))]
  console.log('\nUnique subjects:', subjects)

  // Fetch and show 3 skippable emails' text content
  let shown = 0
  for (const email of notifications) {
    if (shown >= 3) break
    const res = await fetch(`https://api.resend.com/emails/${email.id}`, {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    })
    if (!res.ok) continue
    const full = await res.json()
    if (!full.text?.includes('Registering for')) {
      console.log(`\n--- EMAIL ${email.id} (subject: ${email.subject}) ---`)
      console.log('TEXT:', full.text?.slice(0, 500))
      shown++
    }
    await new Promise(r => setTimeout(r, 300))
  }
}

main()
