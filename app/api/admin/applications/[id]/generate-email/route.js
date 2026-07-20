import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { checkRateLimit, getClientIp } from '../../../../../../lib/rateLimit'
import { getAnthropic } from '../../../../../../lib/anthropic'

// Cached — stable across all calls to this route
const SYSTEM_PROMPT = `You are helping Jerry write short, personal acceptance emails to people who applied for a Canvas Routes road trip event.

Canvas Routes is a small, curated automotive club based in Montreal. They run scenic road trips through Quebec — backroads through the Laurentians, mountain passes, convoy drives where everyone goes together and stops together. The club is selective. Getting accepted means something.

Jerry knows cars. He notices the flat-six note on a 911, knows why an E46 M3 sounds different from a G80, understands what a Cayman is like through a corner versus an open highway, appreciates a well-sorted GTI as much as an exotic. His emails should show that — one specific sentence that only someone who actually knows and loves cars would write.

Write emails that:
- Open with "Hi [first name],"
- Sound like Jerry wrote it himself — warm, direct, no corporate language
- Include exactly ONE specific, enthusiastic sentence about their car. Make it specific to that exact car: the engine note, handling character, how it will feel on mountain roads, what makes that car interesting on a drive like this. This sentence should feel like something a car person says to another car person, not a press release
- If they wrote something in their "tell us more" field, work in a natural one-sentence acknowledgment — not a quote, just a response
- End with exactly this signature on its own lines:
See you on the road,
Jerry
- Body under 100 words (not counting the signature)
- No corporate filler ("excited to have you", "thrilled", "pleasure", "I hope this finds you well")
- No mention of payment, pricing, or logistics`

export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 30, 60)) return Response.json({ error: 'Too many requests' }, { status: 429 })

  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })

  const anthropic = getAnthropic()
  if (!anthropic) return Response.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 503 })

  const supabase = createAdminClient()
  const { data: app, error: fetchErr } = await supabase
    .from('applications')
    .select('name, email, car_year, car_model, more, registrations')
    .eq('id', id)
    .single()

  if (fetchErr || !app) return Response.json({ error: 'Application not found' }, { status: 404 })

  const firstName = (app.name || '').split(' ')[0] || 'there'
  const car = [app.car_year, app.car_model].filter(Boolean).join(' ') || null
  const events = (app.registrations || []).map(r => r.event).filter(Boolean)

  const userPrompt = [
    `Write a personalized acceptance email for this applicant.`,
    `Name: ${app.name || 'Unknown'}`,
    car ? `Car: ${car}` : `Car: Not specified`,
    app.more?.trim() ? `What they said about themselves: "${app.more.trim()}"` : `What they said about themselves: Nothing provided`,
    events.length ? `Event they registered for: ${events[0]}` : null,
    ``,
    `Return ONLY the email body. Start with "Hi ${firstName}," and end with the signature. No subject line, no explanation, no markdown.`,
  ].filter(Boolean).join('\n')

  let subject = 'Canvas Routes — You\'re In'
  if (events.length > 0) {
    const eventLabel = events[0].split('—')[0].trim().split('·')[0].trim()
    if (eventLabel) subject = `Canvas Routes — ${eventLabel}`
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 512,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    })

    const body = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim()

    return Response.json({ subject, body })
  } catch (err) {
    console.error('Claude generate-email error:', err)
    return Response.json(
      { error: process.env.NODE_ENV === 'development' ? err.message : 'Failed to generate email.' },
      { status: 500 }
    )
  }
}
