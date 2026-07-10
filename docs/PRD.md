# PRD — Discover With Leigh v2

**Started:** 2026-07-05 · **Last updated:** 2026-07-09 · **Status:** Built & deployed to preview; paused for Leigh's review, then cutover.

Item numbers are stable IDs (referenced by commits and notes); sections below are ordered by what happens next.

## Vision

Replace the static WordPress/Divi export with a fast, owned, editable site — same brand, same content, same URL — where Leigh-Anne manages content herself and nothing silently rots.

## Problems with the original site

1. **Dead contact form** — the static export severed WPForms from its backend; the form posts to `index.html` and discards submissions.
2. **Frozen social feeds** — Instagram/TikTok sections are snapshots from export day.
3. **Bloat** — 656KB of HTML for one page (every section duplicated for desktop/mobile), 61MB repo.
4. **No content control** — any copy change requires re-exporting from WordPress.

## Stack (all Cloudflare free tier)

| Concern | Choice |
|---|---|
| Framework | Astro (`src/` → `dist/`), non-destructive alongside the old export until cutover |
| Hosting | Cloudflare Worker — renders the public page from D1 per request |
| Content store | D1 (copy, testimonials, gallery metadata, brand logos, enquiries) |
| Images | R2, resized on upload |
| Admin auth | Cloudflare Access on `/admin` + JWT verification in the Worker |
| Spam protection | Cloudflare Turnstile |
| Enquiry email | Cloudflare Email Sending — Worker binding, no third party. Sends to Leigh's verified destination address are quota-free on all plans. (Supersedes Resend, 2026-07-05.) |
| CI/CD | GitHub Actions — test-gated `wrangler deploy` on push to main (validated 2026-07-08) |
| Tests | Vitest (`npm test`, 19 API tests in workerd) + Playwright (`npx playwright test`, 60 UI tests, 6 device profiles) |

## Brand

Dark/black backgrounds, white text, teal accent `#00a79d`, white logo with teal aperture. Headings: custom "Vogue Sans" (self-hosted). Body: Montserrat / Nunito Sans.

## Content inventory

Hero → About → Services overview → Photography (filterable gallery: Product / Lifestyle / Portraits / Live Music / Property / Weddings) → Video (TikTok) → Social Media Management (4-step Discovery Process) → Influencer Campaigns → Client Reviews (4 testimonials) → Brand logos → Contact (details, form, WhatsApp CTA) → Privacy Policy page.

## Use cases & success criteria

| # | Use case | Success criteria |
|---|---|---|
| 1 | Visitor browses portfolio on mobile | Lighthouse ≥ 90 all categories ✅ *(2026-07-10, preview, mobile: perf 92 · a11y 100 · best-practices 100 · SEO 100 · agentic-browsing 100)*; LCP < 2.5s ⚠ 3.0s under Lighthouse's simulated slow-4G (CLS 0.001, TBT 0ms) — real-user LCP to be confirmed from Web Analytics RUM after cutover |
| 2 | Visitor filters gallery by category | Instant client-side filtering, six categories preserved ✅ |
| 3 | Visitor sends an enquiry | Stored in D1, email via Cloudflare Email Sending lands in Leigh's inbox, Turnstile blocks bots ✅ (email pending domain onboarding at cutover) |
| 4 | Visitor taps WhatsApp / social CTAs | All existing links preserved ✅ |
| 5 | Admin edits copy, testimonials, brand logos | Login via Cloudflare Access; changes live within minutes, no developer involved ✅ |
| 6 | Admin manages gallery | Upload to R2 with category + ordering ✅ |
| 7 | Admin reviews enquiries | Submissions list in admin panel ✅ |
| 8 | Developer deploys | Push to main → tests → live in < 5 min; rollback = `git revert` (pipeline validated; opens at cutover) |
| 9 | SEO continuity | Same domain, meta/OG tags, sitemap, `/privacy-policy` kept ✅ *(legacy redirects + branded 404 shipped in item 12; final parity check at cutover)* |

---

# NEXT: buildable during the review pause

*(Item 11 was labelled "post-cutover" but only its traffic panel depends on cutover, noted inline. Building it now means Leigh reviews it on preview in the same pass as everything else.)*

11. **Site insights in admin.** (Added 2026-07-09.) A "live snapshot of how the site is being used" — an Insights tab in the existing admin: a few headline numbers and simple inline-SVG graphs, 7-day view by default with a 30-day toggle, nothing older. Constraints: lean, free, useful, performant. Two data sources, split by who already has the data:
    - **Behaviour (buildable now — what Cloudflare can't see, in D1, bounded):** one `metrics(day, metric, count)` table with upsert-increment; ~15 metrics × 35 days ≈ 500 rows hard ceiling, self-pruned on write. Collected via a single batched `navigator.sendBeacon` per visit on pagehide (flags set by the existing reveal IntersectionObserver + click handlers — no libraries, no cookies, no identifiers, POPIA-clean). Metrics: section-reach funnel, WhatsApp FAB taps, contact form starts (first focus), gallery filter usage per category, social icon clicks per platform.
    - **Enquiry funnel (buildable now, no new tracking):** successful submissions = `enquiries` rows per day (already stored); form errors counted server-side in the existing `/api/contact` handler. Starts vs errors vs submissions = abandonment and friction. *Decision 2026-07-09: client-side "submit clicked" tracking is redundant and excluded.*
    - **Traffic (⏳ gated on cutover step 7 — Cloudflare's data, zero storage ours):** visits, page views, top referrers, top countries — pulled server-side from the free GraphQL Analytics API (RUM datasets, fed by the Web Analytics beacon) using a read-scoped token stored as a Worker secret. Panel ships stubbed "awaiting launch data" until the beacon is live. *Verify at build: RUM dataset retention on the free plan covers 30 days.*

# WAITING ON LEIGH

- **Site review** — the current pause; feedback may spawn one more work round.
- **Item 14 verdict** — aperture shutter-click v4 (see SHIPPED) is live on preview awaiting her approval; the three feedback rounds are recorded there.
- ~~Email destination verify click~~ ✅ done all along — API shows `discoverwithleigh@gmail.com` verified 2026-07-05 22:05, eleven minutes after registration. Email onboarding at cutover is unblocked.
- 📨 **Item 5 — WhatsApp auto-response.** (Added 2026-07-06; handed to Leigh 2026-07-07. No site code; configured in the WhatsApp Business app on the phone holding the business contact number, under Settings → Business tools.)
  - **Greeting message** — https://faq.whatsapp.com/501866148528310 — auto-replies to first-time enquirers (or after 14 days' silence); this answers the website FAB's pre-filled message. Set recipients to "Everyone". Draft copy: *"Hi! Thanks for reaching out to Discover With Leigh 📸 I've seen your message and I'll get back to you personally within a few hours — usually much sooner. To speed things along, tell me a bit about what you have in mind: the type of shoot or campaign, and any dates you're eyeing."*
  - **Away message** — https://faq.whatsapp.com/2565868990219715 — out-of-hours cover for repeat enquirers. The "outside business hours" schedule requires business hours set on the profile first. Draft copy: *"Thanks for your message! I'm out on a shoot right now 🎥 — I'll reply as soon as I'm back. If it's urgent, you can also email [the business email]."*
  - **Leigh's decisions:** response-time promise (only promise what she'll keep), away schedule vs always-on, emoji tone, completing the business profile (hours, description, website link → new site at cutover). The Business Platform/API was considered and rejected — overkill for a one-person studio.

# CUTOVER (phase 5 runbook)

In rough order:

1. **Email Sending onboarding** — onboard `discoverwithleigh.co.za` (dashboard: Email Service → Email Sending → Onboard Domain); check DMARC while there.
2. **GH repo secrets** — `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`; token already has all permissions, pipeline already validated → paste-and-go.
3. **Merge to `main`** — the deploy gate opens; watch the first CI deploy.
4. **Apex DNS → Worker** — add `discoverwithleigh.co.za` as a custom domain alongside preview. The actual cutover moment.
5. **WAF rate-limiting rule** on the zone (abuse protection; DDoS is covered free by default).
6. **AI Crawl Control → ALLOW** — Cloudflare blocks AI crawlers by default; we explicitly welcome them (see AI & search discoverability).
7. **Web Analytics beacon** — enable on the zone (free, privacy-first RUM; feeds item 11).
8. **Search registration** — Google Search Console **and** Bing Webmaster Tools, submit the sitemap to both (ChatGPT's web search uses Bing's index).
9. **Google Business Profile** — link to the site, consistent name/phone/area; start a client Google-review habit (third-party reviews are what Google and LLMs trust). *Deliberate DON'T: no self-serving Review/aggregateRating schema on own testimonials — against Google guidelines.*
10. **Delete the WordPress export** (~180 tracked files) — the old site retired.
11. **Git history rewrite** — squash/`git filter-repo` to purge PII and the export from history. The repo is public, so this is wanted, not optional. Implies a force-push and fresh clones → last act, done once, after everything is merged.

**Post-cutover verifications:** SEO parity (meta/OG, sitemap, `/privacy-policy`), contact form email lands in Leigh's inbox from the live domain, Playwright suite run against production.

# POST-CUTOVER

- **Item 11's traffic panel** — un-stub once the Web Analytics beacon (cutover step 7) has data and the read-scoped GraphQL token is in place.
- **Real-user LCP check** — success criterion 1's 2.5s target vs the 3.0s simulated figure, from Web Analytics RUM.

---

# SHIPPED

## Features (Next-run items, feedback 2026-07-06 onward)

1. ✅ *2026-07-06.* **Gallery → filterable carousel (mobile-first).** CSS scroll-snap horizontal carousel (native swipe, desktop arrows, no library), filter tabs styled as tabs. *(Filter click-handling bug — author `display:block` overriding `hidden` — found and fixed same day.)*
2. ✅ *2026-07-06.* **Floating WhatsApp CTA.** Bottom-right FAB opening a chat with pre-filled message via a wa.me link built from the business number; message copy admin-editable.
3. ✅ *2026-07-06.* **TikTok rotation.** *(Revised after review: two side-by-side embeds looked cramped.)* Single embed in a swipeable scroll-snap carousel; the 10-ID pool (newest 8 from the live profile + 2 originals, in D1 `video.tiktokIds`) is rotated server-side so each load starts on a random video. Pool is admin-curatable via the item-A list editing.
4. ✅ *2026-07-07 (both parts).* **Brands section v2.** (a) Strip contained as a pure-CSS marquee — single row, pause on hover, edge-fade mask, reduced-motion static (chosen at workshop; also closes bug #2). (b) Admin-customisable tiles: migration 0003 added `label` + `enabled` to `brands` (local + remote); tiles render optional captions, hidden tiles filtered in SQL; admin cards grew a label field and Shown/Hidden toggle.
6. ✅ *2026-07-06.* **Light mode + theme toggle.** Token swap under `[data-theme="light"]`, default follows `prefers-color-scheme`, persisted in localStorage, sun/moon toggle. *As-built:* light palette restores the original WordPress design (off-white `#faf9f6`, black bands); header/footer/CTA bands stay dark in both themes (`.always-dark` utility) so the white lockup never needs a dark variant; `color-scheme` declared per theme (note: force-dark extensions like Dark Reader still re-tint — nothing opts out of those).
7. ✅ *2026-07-07.* **Admin-customisable social links.** Socials promoted to a `socials` content section (name + URL + per-link `show`), edited under "Social links"; inline-SVG icons matched by platform name with text fallback; homepage JSON-LD `sameAs` derives from visible links.
8. ✅ *2026-07-07.* **API test suite** — 19 tests, `npm test`, ~1.5s, running in workerd against real D1: middleware auth (fail-closed, bypass requires flag AND loopback), `/api/contact` (honeypot, Turnstile fail-closed, validation, enquiry stored even when email fails), `loadContent` merge, media PATCH branching. *As-built notes:* pool-workers 0.18 (vitest 4) configures via the `cloudflareTest()` Vite plugin; bindings inline (no `dist/` dependency); `astro:middleware` aliased to an identity stub; Turnstile mocked by stubbing global `fetch` (the pool's `fetchMock` was removed).
9. ✅ *2026-07-08 (all but the history rewrite → cutover step 11).* **PII out of source.** Contact phone/email are *published* on the rendered site by design; this keeps them out of the *repo*. Blanked in `site.ts` (live values in D1, admin-edited; fresh environments fill in via admin); Layout footer + privacy page pull via `loadContent()` (privacy now `prerender = false`); `ENQUIRY_EMAIL` is a Worker secret; llms.txt refers to the site instead of listing them; docs genericised. Tracked source verified PII-free except the WP export.
10. ✅ *2026-07-08.* **Responsive UI test suite** — 60 tests, `npx playwright test`, ~30s. Six profiles covering the agreed matrix: desktop 16:9 at 1080p/1440p/4K (Chromium), iPhone 12/13/14 (390×844@3x) + iPhone 15 (393×852@3x) on real WebKit, Galaxy S22–S25 (360×780@3x, Android UA + touch) on Chromium. Per profile: horizontal-overflow assertion with offender diagnostics (both themes), burger/nav, theme toggle persistence, logo→home, FAB placement/tappability/href, gallery scroll/arrows/filters, contact containment (bug #1 guard), Turnstile presence, full-page screenshots to `e2e-artifacts/`. Hermetic (third-party blocked); `webServer` boots build + `wrangler dev --host localhost` itself. *(Now 66 tests — the axe scan from item 12 added one per profile.)*
12. ✅ *2026-07-10 (e4b153f + e76cc21, deployed).* **Launch polish: share cards, redirects, a11y, Lighthouse.**
    - **Share cards** — `public/og.png` (1200×630, lockup over darkened hero + tagline) and `apple-touch-icon.png` (teal aperture on ink), generated from the site's own assets; `og:image`/`twitter:card` wired, image URL on the production domain like canonical/`og:url`.
    - **Redirects + 404** — middleware 301s `privacy-policy.html` / `index.html` / `/home` / `/?p=`; WP debris falls through to the branded "Out of frame" 404. Covered by 2 API tests.
    - **Axe scan** — home + 404 across all six UI profiles; clean on first run.
    - **Lighthouse (preview, mobile): perf 92 · a11y 100 · best-practices 100 · SEO 100 · agentic-browsing 100.** LCP 3.0s, CLS 0.001, TBT 0ms. Getting there surfaced three real defects: astro:assets `<Image>` was a **passthrough placebo** on server-rendered routes (compile-time optimization covers prerendered routes only — every device downloaded the 817KB/892KB/201KB originals) → replaced with static webp variants (`scripts/optimize-images.mjs` → `public/img/`, plain `srcset`); Vogue Sans as late-discovered 111KB TTF made the hero h1's font-swap repaint the ~10s LCP → 25KB woff2 + preload; brands marquee `aria-label` on a role-less div → `role="group"`.
13. ✅ *2026-07-10 (2ab9406, deployed).* **Pre-baked Q&A — chips widget, sensitivity split, dynamic llms.txt.** As workshopped 2026-07-09, all decisions honoured. "Questions?" pill above the WhatsApp FAB (quieter than the FAB by design) opens a compact card: question chips as native `<details name>` exclusive accordions, verbatim admin-curated answers, WhatsApp + contact-form CTAs. New `qa` content section (question/answer/`show`/`public`) edited with the existing admin list machinery. **`show` gates the widget (humans); `show && public` gates the machine surfaces** — llms.txt became a dynamic route rendering the same D1 rows, and the home page emits FAQPage JSON-LD from the same subset; one source of truth, so facts can't drift. Seeds: three public items live; the rates item ships `show:false` with an `R[amount]` placeholder (real figures only in D1, like contact PII). Tests: llms.txt leak guard (a shown-but-private item must never appear) + widget interaction across all six profiles — the suite caught pre-ship that author `display:flex` silently defeats the `hidden` attribute (panel would have been permanently open). *Refinement (Caveshen, same day): on mobile the pill starts minimised as a "?" circle (a tidy column with the FAB) and expands to the labelled pill once the reviews section enters view — the moment rate/booking questions actually form; desktop keeps the full pill throughout.*
14. ✅ *2026-07-10 (0acf473, deployed; Leigh's preview verdict pending).* **Hero aperture animation rework — fixed outer ring.** Three feedback rounds from Leigh (2026-07-09): v1 rotated blades about rim pivots with no housing — the outer edge deformed ("jaws"); v2 (centre rotation + growing pupil ring) fixed the rim but made the blade lines retreat *outward*, the wrong direction (ref: "Sigma Lens Aperture Blades Opening and Closing — Close Up"); v3 restored rim-pivot rotation (correct inward sweep) under a clipPath housing at r=48, with blade material extended to r=75 outside the clip (generated numerically from the frozen paths — everything r≤48 verbatim, rest state pixel-identical) so rotation never uncovers the rim; v4 (ref: iris close-up photo — "lines sharpen into the pinhole, don't vanish") added a translucent hairline edge stroke per blade fading in during the click (the seam a stacked blade casts on the one beneath — same-colour overlapping fills otherwise swallow the lines) and trimmed rotation 24°→14° so it stops down to a small pore with seams converging instead of tangling past centre. Reduced-motion still disables it; clip ids randomised per instance for the axe scan.

## Admin v2 (feedback 2026-07-06 → shipped 2026-07-07)

v1 edited existing values only. Shipped: every array in the content forms has per-item move/remove and an Add button (new item = blanked clone of the list's shape) — covers reviews, services, process steps, about paragraphs, the TikTok pool and socials in one generic mechanism; booleans render as checkboxes. **Whole-section add/remove/reorder: deferred entirely** (decision 2026-07-07 — sections are bespoke components, a developer is needed regardless; revisit if a real need appears).

*Dev note:* local admin requires `npx wrangler dev --host localhost` — without `--host`, wrangler simulates the production route host and the loopback-only auth bypass (correctly) refuses. Astro 7's dev daemon (`npm run dev`) currently 500s on all admin routes — upstream logger bug in its workerd runner.

## Brand mark fidelity (signed off 2026-07-06)

- **Header/footer:** Leigh's original lockup used 1:1 as a trimmed transparent image, build-optimised; footer left-aligned as a signature with legal lines stacked right.
- **Hero:** SVG aperture as the O in DISCOVER, **6 blades** approved (deliberate deviation from the logo's 7); shutter-click on load (open → snap closed → reopen), reduced-motion static. Geometry frozen to literal paths 2026-07-08 (params in the component header; regenerate with the same maths if retuned).
- No dark logo variant exists or is needed — the always-dark header/footer keep the white lockup correct in both themes.

## CI (shipped & validated 2026-07-08)

`.github/workflows/ci.yml` — test job: vitest API suite, then migrations + seed into local D1/R2 (with dummy contact values, since source PII is blanked) and the Playwright matrix with screenshot artifacts; no cloud credentials. Deploy job: `main` only, gated on tests, needs the two GH secrets (cutover step 2). Validated on real runs: deploy gate held, Playwright `github` reporter surfaces failures as annotations, run #3 fully green.

## Bug fixes

1. ✅ *2026-07-06.* **Contact form fields overflow their card on desktop.** Inputs' intrinsic default width (~239px, UA `size="20"`) acted as an automatic minimum inside the form grid; `1fr` tracks couldn't shrink below it. *Fix:* `width: 100%; min-width: 0` on fields, `minmax(0, 1fr)` tracks.
2. ✅ *2026-07-07 (marquee — item 4a).* **Brands strip spans the full window on desktop.** `.brand-strip` sat outside `.wrap`, growing to 12+ tiles per row. *Fix:* contained marquee.
3. ✅ *2026-07-07.* **WhatsApp triple-redundancy in the contact section.** CTA button + socials list + FAB in one viewport; WhatsApp is a contact channel, not social presence. *Fix:* dropped from the list; remaining socials became inline-SVG icons (aria-labelled, teal hover). Admin customisability → item 7.
4. ✅ *2026-07-07 (verified at 1.25 device scale).* **Discovery Process dividers render inconsistently.** Seam 1|2 vanished while 2|3 and 3|4 drew fine. The grid fakes dividers with `gap: 1px` over a `--line` background, and each `<li>` was an individual `.reveal` — its transform promotes the tile to a composited layer snapped to *device* pixels independently of grid layout, so at fractional display scaling a tile can overpaint the 1px gap beside it; which seams survive is rounding luck. *Fix:* reveal the whole `<ol>` as one block (deletes the per-tile transforms — root cause). Fallback if hairlines ever vary at odd zooms: real borders on tiles.
5. ✅ *2026-07-08 (found and verified by the Playwright suite).* **Horizontal scroll on mobile; burger menu and theme toggle pushed off-screen.** The Video section's mobile grid used a bare `1fr` track, whose automatic minimum inherits content's intrinsic width — the TikTok carousel's five 325px slides (~1800px intrinsic) inflated the track, widening the page ~5× on phones; the fixed header spanned that width, parking the burger/toggle at ~1276px on a 360px screen. Same disease as bug #1, grid-track form. *Fix:* `minmax(0, 1fr)` on the mobile track.

---

# Reference

## AI & search discoverability (feedback 2026-07-06)

The site should be findable and summarisable by search engines *and* LLM crawlers — the goal is appearing when someone asks an assistant for photographers / digital marketers in Cape Town. Welcome crawlers; block nothing that reads politely. What we prevent is abuse, not access (Cloudflare's free unmetered DDoS protection + the WAF rate-limit at cutover).

Implemented: robots.txt (allow all, disallow /admin + /api, sitemap reference), /llms.txt business summary (de-PII'd; becomes dynamic with item 13), JSON-LD ProfessionalService on the homepage, sitemap.xml. At cutover: AI Crawl Control → ALLOW (step 6), search registration (step 8).

## Non-goals (v1)

Blog, e-commerce, live Instagram API (deprecated by Meta; the gallery is curated via admin instead), whole-section admin management (deferred by decision), Workers AI chat (item 13 maybe-later).

## Phases

1. ✅ **Scaffold** — Astro + Wrangler deploying to a preview URL.
2. ✅ **Public site** — the one-pager, dark/teal, images migrated.
3. ✅ **Working form** — Turnstile + Email Sending + D1.
4. ✅ **Admin panel** — Cloudflare Access, content editing, gallery upload, enquiry list.
5. ⏳ **Cutover** — see the runbook above.

Preview: https://preview.discoverwithleigh.co.za (custom domain; workers.dev disabled; live apex untouched until cutover).
