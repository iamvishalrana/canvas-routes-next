import { requireAdmin } from '../../../../lib/supabase/authCheck'

const REPO = 'iamvishalrana/canvas-routes-next'
const WORKFLOW = 'health-check.yml'

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const token = process.env.GITHUB_WORKFLOW_TOKEN
  if (!token) return Response.json({ runs: [] })

  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/runs?per_page=4`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
        cache: 'no-store',
      }
    )
    if (!res.ok) return Response.json({ runs: [] })
    const data = await res.json()
    const runs = (data.workflow_runs || []).slice(0, 4).map(r => ({
      conclusion: r.conclusion,   // 'success' | 'failure' | 'timed_out' | null
      status: r.status,           // 'completed' | 'in_progress' | 'queued'
      created_at: r.created_at,
    }))
    return Response.json({ runs })
  } catch {
    return Response.json({ runs: [] })
  }
}

export async function POST() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const token = process.env.GITHUB_WORKFLOW_TOKEN
  if (!token) return Response.json({ error: 'GitHub token not configured' }, { status: 503 })

  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
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
