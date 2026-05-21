const RESEND_API_KEY = process.env.RESEND_API_KEY
const SHEETS_URL = process.env.SHEETS_WEBHOOK_URL
const STOP_BEFORE = new Date('2025-01-01T00:00:00Z') // nothing before Canvas Routes existed

async function fetchWithRetry(url, opts, retries = 4) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, opts)
    if (res.status === 429) {
      const wait = (i + 1) * 1000
      console.log(`Rate limited, waiting ${wait}ms...`)
      await new Promise(r => setTimeout(r, wait))
      continue
    }
    return res
  }
  throw new Error(`Failed after ${retries} retries: ${url}`)
}

async function fetchAllEmails() {
  const emails = []
  let offset = 0
  while (true) {
    const res = await fetchWithRetry(`https://api.resend.com/emails?limit=100&offset=${offset}`, {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    })
    if (!res.ok) { console.error('List error:', await res.text()); break }
    const data = await res.json()
    const batch = data.data ?? data.emails ?? []
    if (!batch.length) break
    emails.push(...batch)
    console.log(`Fetched ${emails.length} emails so far...`)
    if (batch.length < 100) break
    // Resend returns newest-first — stop once we're past the site's launch period
    const oldest = batch[batch.length - 1]?.created_at
    if (oldest && new Date(oldest) < STOP_BEFORE) break
    offset += 100
    await new Promise(r => setTimeout(r, 400))
  }
  return emails
}

function parseEmailText(text) {
  if (!text) return null
  const get = (label) => {
    const match = text.match(new RegExp(`^${label}:\\s*(.+)$`, 'm'))
    return match ? match[1].trim() : ''
  }
  const name = get('Name')
  const email = get('Email')
  const car = get('Car')
  if (!name || !email || !car) return null

  return {
    formType: get('Registering for') || '',
    name,
    email,
    car,
    phone: get('Phone'),
    instagram: get('Instagram'),
    message: get('More'),
    source: get('Source'),
  }
}

const SKIP_NAMES = new Set(['dcsfvvfv', 'jerry', 'yfgh'])

async function main() {
  console.log('Fetching email list from Resend...')
  const all = await fetchAllEmails()
  console.log(`Total emails fetched: ${all.length}`)

  const notifications = all.filter(e => {
    if (!e.subject?.includes('New application')) return false
    const to = Array.isArray(e.to) ? e.to.join('') : (e.to || '')
    if (!to.includes('info@canvasroutes.com')) return false
    return true
  })
  console.log(`Notification emails from May 2 onwards: ${notifications.length}`)

  // Deduplicate: for each unique registrant email, keep first occurrence
  const seen = new Map() // registrant email -> parsed record
  let fetchFailed = 0

  for (const email of notifications) {
    const res = await fetchWithRetry(`https://api.resend.com/emails/${email.id}`, {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    }).catch(() => null)

    if (!res || !res.ok) { fetchFailed++; continue }
    const full = await res.json()
    const parsed = parseEmailText(full.text)

    if (!parsed) continue
    if (SKIP_NAMES.has(parsed.name.toLowerCase())) continue
    if (seen.has(parsed.email)) continue  // deduplicate

    seen.set(parsed.email, parsed)
    await new Promise(r => setTimeout(r, 400))
  }

  console.log(`\nUnique registrants found: ${seen.size}`)
  console.log(`Fetch failures: ${fetchFailed}`)

  // POST each unique registrant to Google Sheets
  let success = 0, failed = 0
  for (const [, record] of seen) {
    const res = await fetch(SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    })
    if (res.ok) {
      console.log(`✓ ${record.name} (${record.email}) — ${record.formType || 'no type'}`)
      success++
    } else {
      console.error(`✗ ${record.name} — webhook returned ${res.status}`)
      failed++
    }
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`\nDone. ${success} sent to Google Sheets, ${failed} failed.`)
}

main()
