// Usage: RESEND_API_KEY=re_xxx node scripts/export-resend.mjs
// Fetches all notification emails from Resend and outputs a CSV of applicants.

const API_KEY = process.env.RESEND_API_KEY
if (!API_KEY) { console.error('Set RESEND_API_KEY env var'); process.exit(1) }

const NOTIFY_SUBJECT_PREFIX = 'New Application'
const PAGE_SIZE = 100

async function fetchEmails(offset = 0) {
  const res = await fetch(`https://api.resend.com/emails?limit=${PAGE_SIZE}&offset=${offset}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  })
  if (!res.ok) { const t = await res.text(); throw new Error(`Resend API: ${t}`) }
  return res.json()
}

async function fetchEmailDetail(id) {
  const res = await fetch(`https://api.resend.com/emails/${id}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  })
  if (!res.ok) return null
  return res.json()
}

function parseText(text) {
  if (!text) return {}
  const lines = text.split('\n')
  const get = (label) => {
    const line = lines.find(l => l.startsWith(`${label}: `))
    return line ? line.slice(label.length + 2).trim() : ''
  }
  return {
    registerFor: get('Registering for'),
    name:        get('Name'),
    email:       get('Email'),
    car:         get('Car'),
    phone:       get('Phone'),
    instagram:   get('Instagram'),
    more:        get('Tell us more') || get('More'),
    source:      get('Source') || get('How they heard'),
  }
}

function csvRow(fields) {
  return fields.map(f => `"${String(f ?? '').replace(/"/g, '""')}"`).join(',')
}

async function main() {
  const notifyEmails = []
  let offset = 0

  while (true) {
    const page = await fetchEmails(offset)
    const emails = page.data ?? page.emails ?? []
    if (!emails.length) break

    for (const e of emails) {
      if ((e.subject || '').startsWith(NOTIFY_SUBJECT_PREFIX)) {
        notifyEmails.push(e)
      }
    }

    if (emails.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  console.error(`Found ${notifyEmails.length} notification emails, fetching details...`)

  const rows = []
  for (const e of notifyEmails) {
    const detail = await fetchEmailDetail(e.id)
    if (!detail) continue
    const data = parseText(detail.text)
    rows.push({ sentAt: e.created_at ?? '', ...data })
  }

  // Sort oldest first
  rows.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))

  const headers = ['Sent At', 'Name', 'Email', 'Car', 'Registering For', 'Phone', 'Instagram', 'More', 'Source']
  console.log(headers.map(h => `"${h}"`).join(','))
  for (const r of rows) {
    console.log(csvRow([r.sentAt, r.name, r.email, r.car, r.registerFor, r.phone, r.instagram, r.more, r.source]))
  }

  console.error(`Done — ${rows.length} rows exported.`)
}

main().catch(e => { console.error(e); process.exit(1) })
