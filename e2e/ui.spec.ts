import { test, expect, type Page } from '@playwright/test';

// Deterministic runs: dark is the site's native scheme; light is tested explicitly.
test.use({ colorScheme: 'dark', reducedMotion: 'reduce' });

// Hermetic: only the dev instance answers. TikTok/Turnstile scripts are
// server-rendered placeholders without their remote JS — presence is asserted,
// third-party behaviour is not under test.
test.beforeEach(async ({ page, baseURL }) => {
  await page.route('**/*', (route) =>
    route.request().url().startsWith(baseURL!) ? route.continue() : route.abort(),
  );
});

const isMobile = (page: Page) => page.viewportSize()!.width <= 760;

async function overflowReport(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const vw = doc.clientWidth;
    const offenders: string[] = [];
    if (doc.scrollWidth > vw) {
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right <= vw + 1) continue;
        // children of scroll/clip containers can't widen the page — skip them
        let clipped = false;
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
          const o = getComputedStyle(a).overflowX;
          if (o === 'hidden' || o === 'auto' || o === 'scroll' || o === 'clip') {
            clipped = true;
            break;
          }
        }
        if (!clipped) offenders.push(`<${el.tagName.toLowerCase()} class="${el.className}"> right=${Math.round(r.right)}px`);
      }
      if (!offenders.length) offenders.push('(no element offender found — suspect a pseudo-element)');
    }
    return { scrollWidth: doc.scrollWidth, clientWidth: vw, offenders: offenders.slice(0, 12) };
  });
}

for (const scheme of ['dark', 'light'] as const) {
  test(`no horizontal overflow (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    const report = await overflowReport(page);
    expect(report.offenders.join('\n'), 'elements wider than the viewport').toBe('');
    expect(report.scrollWidth).toBeLessThanOrEqual(report.clientWidth);
  });
}

test('header: nav vs burger per form factor', async ({ page }) => {
  await page.goto('/');
  const burger = page.locator('#nav-toggle');
  const nav = page.locator('#site-nav');
  if (isMobile(page)) {
    await expect(burger).toBeVisible();
    await expect(nav).toBeHidden();
    await burger.click();
    await expect(nav).toBeVisible();
    await nav.getByRole('link', { name: 'About' }).click();
    await expect(nav).toBeHidden(); // menu closes after navigating
    expect(page.url()).toContain('#about');
  } else {
    await expect(burger).toBeHidden();
    await expect(nav.getByRole('link', { name: 'Contact' })).toBeVisible();
  }
});

test('theme toggle flips and persists', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.locator('#theme-toggle').click();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'light'); // localStorage wins over media query
});

test('logo returns home from another page', async ({ page }) => {
  await page.goto('/privacy-policy');
  await page.locator('.brand').click();
  await page.waitForURL('**/#top');
  expect(new URL(page.url()).pathname).toBe('/');
});

test('WhatsApp FAB: anchored bottom-right, tappable, correct link', async ({ page }) => {
  await page.goto('/');
  const fab = page.locator('.wa-fab');
  await expect(fab).toBeVisible();
  await expect(fab).toHaveAttribute('href', /^https:\/\/wa\.me\/\d+\?text=/);
  const vp = page.viewportSize()!;
  const box = (await fab.boundingBox())!;
  expect(box.x + box.width, 'inside right edge').toBeLessThanOrEqual(vp.width);
  expect(box.y + box.height, 'inside bottom edge').toBeLessThanOrEqual(vp.height);
  expect(vp.width - (box.x + box.width), 'hugs the right edge').toBeLessThanOrEqual(40);
  expect(vp.height - (box.y + box.height), 'hugs the bottom edge').toBeLessThanOrEqual(40);
  // nothing overlays it
  const hit = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x, y)?.closest('.wa-fab') !== null,
    [box.x + box.width / 2, box.y + box.height / 2],
  );
  expect(hit, 'FAB is the top element at its centre').toBe(true);
});

test('gallery: scrollable track, arrows per form factor, filters work', async ({ page }) => {
  await page.goto('/');
  const track = page.locator('#gallery-track');
  const scrollable = await track.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(scrollable, 'gallery track scrolls horizontally').toBe(true);

  const arrow = page.locator('#gallery-next');
  if (isMobile(page)) await expect(arrow).toBeHidden();
  else await expect(arrow).toBeVisible();

  await page.locator('.tab[data-filter="weddings"]').click();
  const shots = page.locator('.shot:visible');
  expect(await shots.count()).toBeGreaterThan(0);
  expect(await page.locator('.shot[hidden]').count(), 'filtering hides non-matching shots').toBeGreaterThan(0);
  for (const cats of await shots.evaluateAll((els) => els.map((e) => e.getAttribute('data-cats')))) {
    expect(cats).toContain('weddings');
  }
});

test('contact: fields stay inside their card, Turnstile present', async ({ page }) => {
  await page.goto('/');
  const form = page.locator('.contact-form');
  await form.scrollIntoViewIfNeeded();
  const formBox = (await form.boundingBox())!;
  for (const field of await page.locator('.contact-form input:not(.trap), .contact-form textarea').all()) {
    const box = (await field.boundingBox())!;
    expect(box.x + box.width, 'field fits its card (bug #1 regression)').toBeLessThanOrEqual(
      formBox.x + formBox.width + 1,
    );
  }
  await expect(page.locator('.cf-turnstile')).toBeAttached();
});

for (const scheme of ['dark', 'light'] as const) {
  test(`screenshot artifact (${scheme})`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await page.addStyleTag({ content: '.reveal{opacity:1!important;translate:none!important}' });
    await page.screenshot({
      path: `e2e-artifacts/${testInfo.project.name}-${scheme}.png`,
      fullPage: true,
      scale: 'css', // 3x-DPR phones exceed the 32767px capture limit otherwise
    });
  });
}
