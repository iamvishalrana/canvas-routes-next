import { test, expect } from '@playwright/test'

// Dismiss the WTET launch popup if it's on screen, so it doesn't
// interfere with subsequent interactions on the homepage.
async function dismissPopup(page) {
  const close = page.locator('button[aria-label="Close"]').first()
  if (await close.isVisible({ timeout: 2000 }).catch(() => false)) {
    await close.click()
  }
}

// ─── Homepage Join Form ───────────────────────────────────────────────────────

test('homepage loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Canvas Routes/, { timeout: 15000 })
  await dismissPopup(page)
  await expect(page.locator('img.hero-logo')).toBeVisible()
})

test('homepage inquiry form renders', async ({ page }) => {
  await page.goto('/')
  await dismissPopup(page)
  await page.locator('#join').scrollIntoViewIfNeeded()
  await expect(page.locator('#join input[type="text"]')).toBeVisible({ timeout: 15000 })
  await expect(page.locator('#join input[type="email"]')).toBeVisible()
  await expect(page.locator('#join button[type="submit"]')).toBeVisible()
})

test('inquiry API validation works', async ({ request }) => {
  const res = await request.post('/api/inquiry', { data: {} })
  expect([400, 429]).toContain(res.status())
  if (res.status() === 400) {
    const body = await res.json()
    expect(body.error).toBe('Please enter your name.')
  }
})

test('inquiry API rejects invalid email', async ({ request }) => {
  const res = await request.post('/api/inquiry', { data: { name: 'Health Check', email: 'not-an-email' } })
  expect([400, 429]).toContain(res.status())
  if (res.status() === 400) {
    const body = await res.json()
    expect(body.error).toBe('Please enter a valid email.')
  }
})

test('waitlist API reachable (honeypot — no DB write)', async ({ request }) => {
  const res = await request.post('/api/waitlist', {
    data: { registerFor: 'Canvas Routes Membership', name: 'Health Check', email: 'healthcheck@example.com', year: '2020', carMake: 'BMW', carModel: '330i', dob_month: '6', dob_day: '15', source: 'Other', _hp: 'healthcheck' },
  })
  expect([200, 429]).toContain(res.status())
})

test('waitlist API validation logic works', async ({ request }) => {
  const res = await request.post('/api/waitlist', { data: {} })
  expect([400, 429]).toContain(res.status())
  if (res.status() === 400) {
    const body = await res.json()
    expect(body.error).toBe('Name, email, year, and car model are required')
  }
})

test('waitlist API rejects invalid registration type', async ({ request }) => {
  const res = await request.post('/api/waitlist', {
    data: { registerFor: 'INVALID', name: 'Health Check', email: 'healthcheck@example.com', year: '2020', carMake: 'BMW', carModel: '330i', dob_month: '6', dob_day: '15', source: 'Other' },
  })
  expect([400, 429]).toContain(res.status())
  if (res.status() === 400) {
    const body = await res.json()
    expect(body.error).toBe('Invalid registration type')
  }
})

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
  if (closed) return
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
  const res = await request.post('/api/routes', { data: {} })
  expect([400, 410, 429]).toContain(res.status())
  if (res.status() === 400) {
    const body = await res.json()
    expect(body.error).toBe('Please fill in all required fields.')
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
  const res = await request.post('/api/membership-waitlist', { data: {} })
  expect([400, 429]).toContain(res.status())
  if (res.status() === 400) {
    const body = await res.json()
    expect(body.error).toBe('Please enter your full name.')
  }
})

test('membership API rejects invalid tier', async ({ request }) => {
  const res = await request.post('/api/membership-waitlist', {
    data: { name: 'Health Check', email: 'healthcheck@example.com', year: '2020', carMake: 'BMW', carModel: '330i', tier: 'INVALID_TIER', source: 'Other' },
  })
  expect([400, 429]).toContain(res.status())
  if (res.status() === 400) {
    const body = await res.json()
    expect(body.error).toBe('Please select a membership tier.')
  }
})

// ─── Partners ────────────────────────────────────────────────────────────────

test('partners page loads', async ({ page }) => {
  await page.goto('/partners')
  await expect(page.getByRole('heading', { name: /Be part of/i })).toBeVisible({ timeout: 15000 })
})

test('partners page form inputs render', async ({ page }) => {
  await page.goto('/partners')
  await expect(page.locator('input[autocomplete="organization"]')).toBeVisible({ timeout: 15000 })
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('button[type="submit"]')).toBeVisible()
})

test('partners API reachable (honeypot — no email sent)', async ({ request }) => {
  const res = await request.post('/api/partners', {
    data: { name: 'Health Check', business: 'Health Check Co', city: 'Montreal', type: 'Other', email: 'healthcheck@example.com', message: 'Health check test.', _hp: 'healthcheck' },
  })
  expect([200, 429]).toContain(res.status())
})

test('partners API validation logic works', async ({ request }) => {
  const res = await request.post('/api/partners', { data: {} })
  expect([400, 429]).toContain(res.status())
  if (res.status() === 400) {
    const body = await res.json()
    expect(body.error).toBe('All fields are required.')
  }
})

test('partners API rejects invalid business type', async ({ request }) => {
  const res = await request.post('/api/partners', {
    data: { name: 'Health Check', business: 'Health Check Co', city: 'Montreal', type: 'INVALID_TYPE', email: 'healthcheck@example.com', message: 'Health check test.' },
  })
  expect([400, 429]).toContain(res.status())
  if (res.status() === 400) {
    const body = await res.json()
    expect(body.error).toBe('Please select a valid business type.')
  }
})

// ─── Members Portal ───────────────────────────────────────────────────────────

test('portal dashboard redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/members/dashboard')
  await expect(page).toHaveURL(/\/members\/login/, { timeout: 15000 })
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
})

test('portal profile redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/members/profile')
  await expect(page).toHaveURL(/\/members\/login/, { timeout: 15000 })
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
})

// ─── Forgot Password / Reset ─────────────────────────────────────────────────

test('forgot password API validation works', async ({ request }) => {
  // Empty body — confirms parsing and validation runs
  const res = await request.post('/api/auth/forgot-password', { data: {} })
  expect([400, 429]).toContain(res.status())
  if (res.status() === 400) {
    const body = await res.json()
    expect(body.error).toBe('Email required.')
  }
})

test('set password API validation works', async ({ request }) => {
  // Empty body — confirms parsing and validation runs (no valid token = 400)
  const res = await request.post('/api/auth/set-password', { data: {} })
  expect([400, 429]).toContain(res.status())
})

// ─── Members Login ────────────────────────────────────────────────────────────

test('login page loads', async ({ page }) => {
  await page.goto('/members/login')
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15000 })
  await expect(page.locator('input[type="password"]')).toBeVisible()
})

test('login API validation logic works', async ({ request }) => {
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
