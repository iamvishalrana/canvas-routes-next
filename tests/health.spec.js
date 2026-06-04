import { test, expect } from '@playwright/test'

// ─── Route Registration ───────────────────────────────────────────────────────

test('route page loads', async ({ page }) => {
  await page.goto('/routes/into-the-laurentians')
  // Heading is always present regardless of whether registration is open or closed
  await expect(page.getByRole('heading', { name: /Into the Laurentians/i })).toBeVisible({ timeout: 15000 })
})

test('route page shows form or closed message', async ({ page }) => {
  await page.goto('/routes/into-the-laurentians')
  const form = page.locator('text=Apply for your spot')
  const closed = page.locator('text=Registration is now closed')
  await expect(form.or(closed)).toBeVisible({ timeout: 15000 })
})

test('route API responds', async ({ request }) => {
  // _hp (honeypot) causes the API to return success immediately —
  // no DB write, no email sent. Still confirms the route is reachable and boots correctly.
  // After June 7, registration closes and returns 410 before the honeypot check — both are healthy.
  const res = await request.post('/api/routes', {
    data: {
      name: 'Health Check',
      email: 'healthcheck@example.com',
      dob: '1990-06-15',
      year: '2020',
      carMake: 'BMW',
      carModel: 'BMW 330i',
      passengers: '1',
      hasChildren: 'no',
      source: 'Other',
      _hp: 'healthcheck',
    },
  })
  expect([200, 410, 429]).toContain(res.status())
  if (res.status() === 200) {
    const body = await res.json()
    expect(body.success).toBe(true)
  }
})

// ─── Membership Waitlist ──────────────────────────────────────────────────────

test('membership page loads', async ({ page }) => {
  await page.goto('/membership')
  await expect(page.getByText('Routes Member').first()).toBeVisible({ timeout: 15000 })
})

test('membership API responds', async ({ request }) => {
  const res = await request.post('/api/membership-waitlist', {
    data: {
      name: 'Health Check',
      email: 'healthcheck@example.com',
      year: '2020',
      carMake: 'BMW',
      tier: 'Routes Member',
      source: 'Other',
      _hp: 'healthcheck',
    },
  })
  expect([200, 429]).toContain(res.status())
  if (res.status() === 200) {
    const body = await res.json()
    expect(body.success).toBe(true)
  }
})

// ─── Members Portal ──────────────────────────────────────────────────────────

test('portal dashboard redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/members/dashboard')
  // Middleware redirects unauthenticated users to /members/login
  await expect(page).toHaveURL(/\/members\/login/, { timeout: 15000 })
  await expect(page.locator('input[type="email"]')).toBeVisible()
})

test('portal profile redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/members/profile')
  await expect(page).toHaveURL(/\/members\/login/, { timeout: 15000 })
})

// ─── Members Login ────────────────────────────────────────────────────────────

test('login page loads', async ({ page }) => {
  await page.goto('/members/login')
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15000 })
  await expect(page.locator('input[type="password"]')).toBeVisible()
})

test('login API and Supabase auth reachable', async ({ request }) => {
  // Deliberately bad credentials — expects 401. Confirms Supabase auth is reachable.
  // 429 means rate-limited, which also means the API is up.
  const res = await request.post('/api/auth/login', {
    data: { email: 'healthcheck@example.com', password: 'not-a-real-password' },
  })
  expect([401, 429]).toContain(res.status())
  if (res.status() === 401) {
    const body = await res.json()
    expect(body.error).toBe('Incorrect email or password.')
  }
})
