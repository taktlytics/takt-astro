import { test, expect, type Page } from '@playwright/test'

type Beacon = { n: string; d?: string; u?: string; p?: Record<string, string> }

// Intercept every analytics beacon (sendBeacon or fetch fallback) and record its
// parsed body, answering 202 so the app sees a successful send.
async function collect(page: Page): Promise<Beacon[]> {
  const events: Beacon[] = []
  await page.route('**/api/event', (route) => {
    events.push(JSON.parse(route.request().postData() || '{}'))
    return route.fulfill({ status: 202, body: '' })
  })
  return events
}

// The contract both public install paths (integration + <Takt /> component) must
// satisfy. baseURL is provided per Playwright project.
export function contractTests(): void {
  test('fires a pageview on load', async ({ page }) => {
    const events = await collect(page)
    await page.goto('/')
    await expect.poll(() => events.find((e) => e.n === 'pageview')?.d).toBe('example.com')
  })

  test('tracks a custom event on click', async ({ page }) => {
    const events = await collect(page)
    await page.goto('/')
    await page.click('#signup')
    await expect.poll(() => events.find((e) => e.n === 'Signup')?.p).toEqual({ plan: 'pro' })
  })

  test('counts exactly one pageview per SPA navigation', async ({ page }) => {
    const events = await collect(page)
    await page.goto('/')
    await page.click('#nav')
    await page.waitForURL('**/about')
    await expect.poll(() => events.filter((e) => e.n === 'pageview').length).toBeGreaterThanOrEqual(2)
    // Settle, then assert the exact count — guards against the ClientRouter
    // double-count where several history ops fire per navigation.
    await page.waitForTimeout(500)
    expect(events.filter((e) => e.n === 'pageview').length).toBe(2)
  })

  test('sends the route template of a dynamic page on load', async ({ page }) => {
    const events = await collect(page)
    await page.goto('/blog/hello')
    await expect
      .poll(() => new URL(events.find((e) => e.n === 'pageview')?.u ?? 'http://x/').pathname)
      .toBe('/blog/[slug]')
  })

  test('reads the route template of the new page after a ClientRouter navigation', async ({ page }) => {
    const events = await collect(page)
    await page.goto('/')
    await expect.poll(() => events.filter((e) => e.n === 'pageview').length).toBe(1)
    await page.click('#post')
    await page.waitForURL('**/blog/hello')
    await expect
      .poll(() => events.filter((e) => e.n === 'pageview').map((e) => new URL(e.u ?? 'http://x/').pathname))
      .toEqual(['/', '/blog/[slug]'])
  })
}
