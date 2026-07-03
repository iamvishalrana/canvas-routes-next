import { buildAdminNotifyHtml } from './adminEmail.js'
import { normalizeWtetLunch } from './wtetRegistrationContent.js'

// Trip Details, Waiver, and Lunch each save independently and in any order
// (Lunch requires Trip Details first, but Waiver can land before or after
// either). Rather than emailing Jerry a partial summary the moment any one
// step finishes, this re-fetches the full row and only sends once all three
// are actually done — one email with everything, including food choices.
export async function notifyIfWtetComplete(admin, appId) {
  const { data: app } = await admin
    .from('applications')
    .select('name, email, wtet_checkin, wtet_waiver, wtet_lunch, car_year, car_make, car_model')
    .eq('id', appId)
    .maybeSingle()
  if (!app) return false

  const passengersList = app.wtet_checkin?.passengers_list || []
  const lunch = normalizeWtetLunch(app.wtet_lunch)
  const isComplete = !!app.wtet_checkin && !!app.wtet_waiver && lunch.length > 0 && lunch.length === passengersList.length
  if (!isComplete) return false
  if (!process.env.RESEND_API_KEY) return true

  const vehicle = [
    app.wtet_waiver.vehicle?.year || app.car_year,
    app.wtet_waiver.vehicle?.make || app.car_make,
    app.wtet_waiver.vehicle?.model || app.car_model,
  ].filter(Boolean).join(' ') || '—'

  const personLabel = i => (i === 0 ? 'Driver' : `Passenger ${i + 1}`)
  const passengersRow = passengersList.map((p, i) => `${personLabel(i)}: ${p.name}, age ${p.age}`).join('<br>')
  const lunchRow = lunch.map((entry, i) => `${entry.name || personLabel(i)}: ${entry.dish_name}`).join('<br>')
  const emergency = app.wtet_waiver.emergency_contact || {}

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: 'Canvas Routes <info@canvasroutes.com>',
      to: 'jerry@canvasroutes.com',
      subject: `Check-in Complete — ${app.name || 'Registrant'}`,
      html: buildAdminNotifyHtml('Whips to Eastern Townships — Check-in complete', [
        ['Name', `<strong>${app.name || '—'}</strong>`],
        ['Email', `<a href="mailto:${app.email}" style="color:#1a1a1a;">${app.email || '—'}</a>`],
        ['Passengers', passengersRow],
        ['Dietary', app.wtet_checkin.dietary || 'None'],
        ['WhatsApp', app.wtet_checkin.whatsapp || 'Not provided'],
        ['Vehicle', vehicle],
        ['Emergency contact', `${emergency.name || '—'} · ${emergency.phone || '—'}`],
        ['Waiver signed', `${app.wtet_waiver.full_name} on ${new Date(app.wtet_waiver.signed_at).toLocaleString('en-CA', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`],
        ['Lunch', lunchRow],
      ]),
    }),
  })
  return true
}
