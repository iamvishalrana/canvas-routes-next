import { requireAdmin } from '../../../../lib/supabase/authCheck'

export async function POST() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const token = process.env.GITHUB_WORKFLOW_TOKEN
  if (!token) return Response.json({ error: 'GitHub token not configured' }, { status: 503 })

  const res = await fetch(
    'https://api.github.com/repos/iamvishalrana/canvas-routes-next/actions/workflows/health-check.yml/dispatches',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    }
  )

  if (res.status === 204) return Response.json({ ok: true })
  const text = await res.text().catch(() => '')
  return Response.json({ error: `GitHub returned ${res.status}: ${text}` }, { status: 500 })
}
