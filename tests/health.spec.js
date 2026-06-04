import { test, expect } from '@playwright/test'

// ─── Route Registration ───────────────────────────────────────────────────────

test('route page loads', async ({ page }) => {
  await page.goto('/routes/into-the-laurentians')
  await expect(page.getByRole('heading', { name: /Into the Laurentians/i })).toBeVisible({ timeout: 15000 })
})

test('route page shows form or closed message', async ({ page }) => {
  await page.goto('/routes/into-the-laurentians')
  const form = page.locator('text=Apply for your spot')
  const closed = page.locator('text=Registration is now closed')
  await expect(form.or(closed)).toBeVisible({ timeout: 15000 })
})

test('route page form inputs render when open', async ({ page }) => {
  await page.goto('/routes/into-the-laurentians')
  const closed = await page.locator('text=Registration is now closed').isVisible().catch(() => false)
  if (closed) return // registration closed — skip input checks
  await expect(page.locator('input#field-name')).toBeVisible({ timeout: 15000 })
  await expect(page.locator('input#field-email')).toBeVisible()
  await expect(page.locator('button[type="submit"]')).toBeVisible()
})

test('route API reachable (honeypot — no DB write)', async ({ request }) => {
  const res = await request.post('/api/routes', {
    data: { name: 'Health Check', email: 'healthcheck@example.com', dob: '1990-06-15', year: '2020', carMake: 'BMW', carModel: 'BMW 330i', passengers: '1', hasChildren: 'no', source: 'Other', _hp: 'healthcheck' },
  })
  expect([200, 410, 429]).toContain(res.status())
})

test('route API validation logic works', async ({ request }) => {
  // Sends an empty body — confirms request parsing and validation code runs correctly.
  // 400 = validation ran (code is working), 410 = registration closed (also healthy), 429 = rate limited (API is up)
  const res = await request.post('/api/routes', { data: {} })
  expect([400, 410, 429]).toContain(res.status())
  if (res.status() === 400) {
    const body = await res.json()
    expect(body.error).toBeTruthy()
  }
})

// ─── Membership Waitlist ──────────────────────────────────────────────────────

test('membership page loads', async ({ page }) => {
  await page.goto('/membership')
  await expect(page.getByText('Routes Member').first()).toBeVisible({ timeout: 15000 })
})

test('membership page form inputs render', async ({ page }) => {
  await page.goto('/membership')
  await expect(page.locator('input[type="text"]').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('button[type="submit"]')).toBeVisible()
})

test('membership API reachable (honeypot — no DB write)', async ({ request }) => {
  const res = await request.post('/api/membership-waitlist', {
    data: { name: 'Health Check', email: 'healthcheck@example.com', year: '2020', carMake: 'BMW', tier: 'Routes Member', source: 'Other', _hp: 'healthcheck' },
  })
  expect([200, 429]).toContain(res.status())
})

test('membership API validation logic works', async ({ request }) => {
  // Empty body — confirms parsing and validation code runs correctly
  const res = await request.post('/api/membership-waitlist', { data: {} })
  expect([400, 429]).toContain(res.status())
  if (res.status() === 400) {
    const body = await res.json()
    expect(body.error).toBe('Please enter your full name.')
  }
})

test('membership API rejects invalid tier', async ({ request }) => {
  // Valid fields except tier — confirms tier validation specifically runs
  const res = await request.post('/api/membership-waitlist', {
    data: { name: 'Health Check', email: 'healthcheck@example.com', year: '2020', carMake: 'BMW', tier: 'INVALID_TIER', source: 'Other' },
  })
  expect([400, 429]).toContain(res.status())
  if (res.status() === 400) {
    const body = await res.json()
    expect(body.error).toBe('Please select a membership tier.')
  }
})

// ─── Members Portal ───────────────────────────────────────────────────────────

test('portal dashboard redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/members/dashboard')
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

test('login API validation logic works', async ({ request }) => {
  // Empty body — confirms parsing and validation code runs correctly
  const res = await request.post('/api/auth/login', { data: {} })
  expect([400, 429]).toContain(res.status())
  if (res.status() === 400) {
    const body = await res.json()
    expect(body.error).toBe('Email and password required.')
  }
})

test('login API and Supabase auth reachable', async ({ request }) => {
  // Bad credentials — confirms Supabase auth is reachable and the auth flow runs end-to-end
  const res = await request.post('/api/auth/login', {
    data: { email: 'healthcheck@example.com', password: 'not-a-real-password' },
  })
  expect([401, 429]).toContain(res.status())
  if (res.status() === 401) {
    const body = await res.json()
    expect(body.error).toBe('Incorrect email or password.')
  }
})
