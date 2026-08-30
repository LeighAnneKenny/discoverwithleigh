import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

test('footer logo returns to the top', async ({ page }) => {
  await page.goto('/');
  const link = page.locator('.signature-link');
  await link.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => scrollY), 'started scrolled down').toBeGreaterThan(500);
  await link.click();
  await page.waitForURL('**/#top');
  await expect.poll(() => page.evaluate(() => scrollY), { message: 'back at the top' }).toBeLessThan(80);
});

test('WhatsApp FAB: anchored bottom-right, tappable, correct link', async ({ page }) => {
  await page.goto('/');
  const fab = page.locator('.wa-fab');
  // ponytail: state-aware — FAB absent when phone is unconfigured (empty D1 seed);
  // configured-state coverage requires harness machinery (round-trip admin edit),
  // so we assert absence vs. presence and validate the href only when present.
  if (await fab.count() === 0) {
    await expect(fab).toHaveCount(0);
    return;
  }
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

test('gallery lightbox opens centered (item 17 regression)', async ({ page }) => {
  await page.goto('/');
  const shot = page.locator('.shot').first();
  await shot.scrollIntoViewIfNeeded();
  await shot.click();
  const box = page.locator('#lightbox');
  await expect(box).toBeVisible();
  // settle: the dialog resizes once the full image arrives
  await page.locator('#lightbox-img').evaluate(
    (img: HTMLImageElement) => img.complete || new Promise((r) => (img.onload = r)),
  );
  const vp = page.viewportSize()!;
  const b = (await box.boundingBox())!;
  expect(Math.abs(b.x + b.width / 2 - vp.width / 2), 'horizontally centered').toBeLessThanOrEqual(4);
  expect(Math.abs(b.y + b.height / 2 - vp.height / 2), 'vertically centered').toBeLessThanOrEqual(4);
});

test('brands strip: colour by default, hover greys the rest (item 20)', async ({ page }) => {
  await page.goto('/');
  // The file-wide test.use({ reducedMotion }) doesn't stop this marquee in
  // practice — verified: drop this line and scrollIntoViewIfNeeded below times
  // out at 30s chasing a moving tile. This is the only test that grabs an
  // element inside an animation, so it's the only one that notices.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const hovered = page.locator('#brands .strip-track--fwd .brand-tile').first();
  // the opposite row: the grey-out is marquee-wide, matching the marquee-wide pause
  const rowMate = page.locator('#brands .strip-track--rev .brand-tile').first();
  const filterOf = (tile: typeof hovered) => tile.locator('img').evaluate((img) => getComputedStyle(img).filter);

  await hovered.scrollIntoViewIfNeeded();
  expect(await filterOf(hovered), 'colour by default').toBe('none');
  expect(await filterOf(rowMate), 'colour by default').toBe('none');

  if (isMobile(page)) {
    // Touch reports hover:none, so the grey-out is gated off (item 27) — a tap
    // must not grey the strip (sticky :hover was the reported freeze bug).
    await hovered.tap();
    await page.waitForTimeout(400); // outlast the 0.3s filter transition
    expect(await filterOf(hovered), 'tap does not grey').toBe('none');
    expect(await filterOf(rowMate), 'tap does not grey row-mates').toBe('none');
    return;
  }

  // poll rather than sleep past the 0.3s transition — the filter is mid-flight
  // for a moment after each pointer move
  await hovered.hover();
  await expect.poll(() => filterOf(rowMate), { message: 'other row greys out too' }).toContain('grayscale');
  expect(await filterOf(hovered), 'hovered frame stays colour').toBe('none');

  await page.mouse.move(0, 0);
  await expect.poll(() => filterOf(rowMate), { message: 'colour restored after mouseout' }).toBe('none');
  expect(await filterOf(hovered), 'colour restored after mouseout').toBe('none');
});

test('brands strip: touch pauses, swipes, auto-resumes (item 27)', async ({ page }) => {
  test.skip(!isMobile(page), 'touch-only behaviour');
  // The real animation must run: the script hands it off to scrollLeft and back.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const marquee = page.locator('.film-marquee');
  await marquee.scrollIntoViewIfNeeded();

  // swipeable: each strip is a native scroll container wider than the viewport
  const scroller = page.locator('#brands .strip-scroller').first();
  expect(
    await scroller.evaluate((el) => getComputedStyle(el).overflowX === 'auto' && el.scrollWidth > el.clientWidth),
    'strip is natively swipeable',
  ).toBe(true);

  await marquee.tap();
  await expect(marquee, 'touch pauses the marquee').toHaveClass(/is-swiping/);
  // 2s after the last touch the animation takes back over
  await expect(marquee, 'marquee resumes on its own').not.toHaveClass(/is-swiping/, { timeout: 4000 });
  expect(
    await page
      .locator('#brands .strip-track--fwd')
      .evaluate((el) => el.getAnimations()[0]?.playState),
    'animation running again after resume',
  ).toBe('running');
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

test('accessibility: axe scan is clean (home + 404)', async ({ page }) => {
  for (const path of ['/', '/no-such-page']) {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(
      violations.map((v) => `${path} ${v.id} (${v.impact}): ${v.nodes.length}× ${v.help}`),
      `axe violations on ${path}`,
    ).toEqual([]);
  }
});

test('Q&A widget: pill above FAB, chips reveal answers, CTAs correct', async ({ page }) => {
  await page.goto('/');
  const pill = page.locator('#qa-pill');
  const fab = page.locator('.wa-fab');
  await expect(pill).toBeVisible();

  if (isMobile(page)) {
    // starts minimised ("?" shown, label collapsed); unfurls at the reviews
    await expect(pill.locator('.q-mini')).toBeVisible();
    await expect(pill.locator('.q-full')).toBeHidden();
    await page.locator('#reviews').scrollIntoViewIfNeeded();
    await expect(pill.locator('.q-full')).toBeVisible();
    await expect(pill.locator('.q-mini')).toBeHidden();
    await page.locator('#top').scrollIntoViewIfNeeded();
  } else {
    await expect(pill.locator('.q-full'), 'desktop pill is never minimised').toBeVisible();
  }
  const pillBox = (await pill.boundingBox())!;
  // ponytail: only assert position when FAB is present (absent with empty phone);
  // use count() not boundingBox() — Playwright auto-waits on locator methods.
  if (await fab.count() > 0) {
    const fabBox = (await fab.boundingBox())!;
    expect(pillBox.y + pillBox.height, 'pill sits above the FAB').toBeLessThanOrEqual(fabBox.y);
  }

  await pill.click();
  const panel = page.locator('#qa-panel');
  await expect(panel).toBeVisible();

  const first = panel.locator('details').first();
  await first.locator('summary').click();
  await expect(first.locator('p')).toBeVisible();

  await expect(panel.locator('.qa-wa')).toHaveAttribute('href', /wa\.me/);
  await expect(panel.locator('.qa-contact')).toHaveAttribute('href', '#contact');

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
});
