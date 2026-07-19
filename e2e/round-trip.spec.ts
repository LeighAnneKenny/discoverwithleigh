/**
 * Admin → public page round-trip test (PRD item 18).
 *
 * Writes a sentinel value through the real admin save path (PUT /api/admin/content,
 * the same route the admin form posts to), then loads the public home page and
 * asserts the sentinel appears in the rendered HTML.
 *
 * Runs in the dedicated 'round-trip' Playwright project (one device, never
 * duplicated across the 6 UI device profiles). Restores D1 state in finally so
 * other tests are not poisoned.
 *
 * Rendering route chosen: Playwright (not vitest Container API).
 * Reason: the vitest-in-workerd suite imports TypeScript modules directly; .astro
 * pages are only available as compiled output (dist/), which tests deliberately
 * avoid. Playwright already boots the full compiled Worker with real local D1,
 * so the round-trip proves the complete stack without extra tooling.
 */
import { test, expect } from '@playwright/test';

// Serial: this test mutates shared D1 state, so run one at a time.
test.describe.configure({ mode: 'serial' });

test('round-trip: admin save → public page HTML', async ({ page, request }) => {
  // Read the current about section from the real admin API (preserves any D1 edits).
  const getRes = await request.get('/api/admin/content');
  expect(getRes.ok()).toBe(true);
  const current = await getRes.json();
  const originalAbout = current.about as Record<string, unknown>;

  const sentinel = 'ROUNDTRIP_SENTINEL_ABOUT_HEADING';

  // Write sentinel through the real admin save path.
  const putRes = await request.put('/api/admin/content', {
    headers: { 'Content-Type': 'application/json' },
    data: { key: 'about', value: { ...originalAbout, heading: sentinel } },
  });
  expect(putRes.ok()).toBe(true);

  try {
    // The public home page must render the sentinel value.
    await page.goto('/');
    await expect(page.locator('#about h2')).toContainText(sentinel);
  } finally {
    // Always restore — even if the assertion above fails.
    await request.put('/api/admin/content', {
      headers: { 'Content-Type': 'application/json' },
      data: { key: 'about', value: originalAbout },
    });
  }
});
