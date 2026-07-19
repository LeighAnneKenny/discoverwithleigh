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

16. **Brands section v3 — film-strip counter-marquee.** *(Leigh's review feedback 2026-07-19: the v2 marquee "looks a bit too similar to other sites" — the grayscale edge-faded logo marquee is the most templated pattern on the web. Workshop outcome: Caveshen's dual counter-scrolling rows + film-strip styling to make the motion unmistakably a photographer's.)*
    - **Layout:** brands split server-side into two rows — top gets `ceil(n/2)`, bottom the rest; if the bottom row would be empty, fall back to a single strip. Rows scroll in opposite directions (pure CSS, `animation-direction: reverse` on row 2, slightly different durations so the pairing doesn't look mechanical).
    - **Film-strip dressing:** each row styled as a strip of film — sprocket-hole bands top and bottom (CSS gradients, no images), frame separators, small generated contact-sheet frame numbers (decorative); admin `label` remains the caption. Film base stays ink-dark in **both** themes (film is dark — the light-theme brightness hack goes).
    - **Behaviour kept from v2:** contained in `.wrap` (bug #2), edge-fade mask, grayscale→colour on hover + teal focus ring on the hovered frame, pause on hover, reduced-motion = static scrollable strip, duplicated loop content `aria-hidden`.
    - **Loop correctness:** each animated half must exceed the container width regardless of brand count — repeat row items as needed for a seamless `-50%` loop.
    - **No data changes:** existing `brands` schema (logo, `label`, `enabled`) suffices; no migration, no JS, no new dependencies.
    - **Done when:** both suites green; screenshots (desktop + mobile, both themes, reduced-motion) reviewed by Caveshen; then deployed to preview for Leigh's verdict.
    - *Status 2026-07-19:* built (pure-CSS "film gate" — sprocket bands fixed, logos move through them), reviewer approved 7/7, 34 API + 78 UI green, look approved by Caveshen; deployed to preview → awaiting Leigh's verdict.

17. ✅ *2026-07-19.* **Gallery: selected image should open centered.** *(Leigh's feedback 2026-07-19.)* Selecting an image to view in the gallery carousel doesn't present it centered. ~~Likely `scroll-snap-align` territory~~ *Root cause found on investigation — not scroll-snap at all:* "select to view" opens the native `<dialog>` lightbox, which the browser centers via UA `dialog { margin: auto }` — and global.css's `* { margin: 0 }` reset was killing exactly that, pinning the open dialog to the viewport's top-left. *Fix:* restore `dialog { margin: auto }` in global.css beside the reset (covers any future dialog, not just this one) + centering regression test in the UI suite. Reclassified from enhancement to bug once the cause was known.

18. **Admin→site round-trip test coverage.** *(Prompted by bug #7 — Leigh edited a title in admin and the site didn't change, while other edits worked.)* Close the class of "admin exposes a field the site never renders" (and its inverse) mechanically, in the pipeline, not on live:
    - **Round-trip integration tests** in the existing vitest-in-workerd suite (it already runs a real local D1): write a value through the admin save path → render the public page HTML → assert the value appears. No cloud, no preview needed.
    - **Exhaustiveness check derived from the content shape** (the same shape that drives the admin's generic list machinery): every editable key must either provably affect rendered output or sit on an explicit exemption list with a reason. This is the test that would have caught `hero.title` silently going nowhere.
    - Bug #7's fix (drop or wire the dead field) lands with this item. *Decision 2026-07-19: **drop** `hero.title` — the h1 is the signed-off brand lockup (aperture-as-O, see Brand mark fidelity) and can't render arbitrary text; `meta.title` remains the editable title and already flows.*
    - *Status 2026-07-19: built.* As-built: `hero.title` dropped from defaults/seed (stale D1 keys proven harmless by a merge test — `Hero.astro` never reads them); round-trip test lives in **Playwright**, not vitest (the vitest suite imports TS modules directly and deliberately avoids compiled `dist/` output, which is the only place rendered `.astro` pages exist — Playwright already boots the full compiled Worker on real local D1), as its own `round-trip` project so the six device projects don't multiply it; exhaustiveness check in vitest enumerates every editable shape key against renders/exemptions (exempt: `socials[*].show`, `qa[*].show`, `qa[*].public` — behaviour-gating booleans, with reasons in the test file). Proven to fail on a resurrected `hero.title`. Suites: 37 API + 79 UI.

19. **Client reviews section — presentation ideas board.** *(Leigh's feedback 2026-07-19.)* She asked whether reviews could be a one-at-a-time scroller like the TikTok embed (item 3's scroll-snap single-slide pattern — reusable). Honest counterpoint recorded up front: reviews are text — a one-at-a-time carousel hides N−1 testimonials and demands interaction to read social proof, which is why review walls usually show several at once. Workshop options before building: (a) TikTok-style single-slide snap carousel, (b) current layout kept, (c) middle path — e.g. featured quote large with the rest as a compact strip, or auto-advancing quote with reduced-motion fallback. Decision belongs to Leigh with the trade-off stated.

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

1. ~~Email Sending onboarding~~ **RETIRED 2026-07-12** — Onboard Domain is Workers Paid only and unnecessary: verified-destination sends are free on all plans and Email Routing is already enabled on the zone (see item 15c). Enquiry email ✅ confirmed in-inbox from preview 2026-07-12. Only remnant: add a DMARC record (`v=DMARC1; p=none`) — the domain has none.
2. **GH repo secrets** — `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`; token already has all permissions, pipeline already validated → paste-and-go.
3. **Merge to `main`** — the deploy gate opens; watch the first CI deploy.
4. **Apex DNS → Worker** — add `discoverwithleigh.co.za` as a custom domain alongside preview. The actual cutover moment.
5. **WAF rate-limiting rule** on the zone (abuse protection; DDoS is covered free by default).
6. **AI Crawl Control → ALLOW** — Cloudflare blocks AI crawlers by default; we explicitly welcome them (see AI & search discoverability).
7. **Web Analytics beacon** — enable on the zone (free, privacy-first RUM; feeds item 11).
8. **Search registration** — Google Search Console **and** Bing Webmaster Tools, submit the sitemap to both (ChatGPT's web search uses Bing's index).
9. **Google Business Profile** — link to the site, consistent name/phone/area; start a client Google-review habit (third-party reviews are what Google and LLMs trust). *Deliberate DON'T: no self-serving Review/aggregateRating schema on own testimonials — against Google guidelines.*
10. **Delete the WordPress export** (~180 tracked files) — the old site retired.
11. **Git history rewrite** — squash/`git filter-repo` to purge PII and the export from history. *(Known targets: the WP export, and `scripts/seed.sql` — a generated artifact untracked since, but old commits (4cf133a…46602c0) carry real contact values.)* The repo is public, so this is wanted, not optional. Implies a force-push and fresh clones → last act, done once, after everything is merged.

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
11. ✅ *2026-07-11 (304ff5d, deployed; traffic panel stubbed until cutover step 7).* **Site insights in admin.** As specced: `metrics(day, metric, count)` (migration 0004) with the ~500-row ceiling, self-pruned past 35 days on write; `/api/metrics` accepts allowlisted names only (exact set + bounded `filter:`/`social:` patterns, deduped, capped) so garbage can't mint rows; one `sendBeacon` per visit on first hide — no cookies, no identifiers; contact errors counted server-side (honeypot bots excluded); admin Insights tab (stat tiles, per-day teal bar charts validated against the admin surface, section-reach funnel, filter/social rankings, 7d/30d, inline SVG only). *Addition: `qa_open` counter — the Q&A widget postdates the workshop list and deserves a worth-it signal.* Traffic panel stubbed pending the Web Analytics beacon + read-scoped GraphQL token; un-stub is the POST-CUTOVER item.
13. ✅ *2026-07-10 (2ab9406, deployed).* **Pre-baked Q&A — chips widget, sensitivity split, dynamic llms.txt.** As workshopped 2026-07-09, all decisions honoured. "Questions?" pill above the WhatsApp FAB (quieter than the FAB by design) opens a compact card: question chips as native `<details name>` exclusive accordions, verbatim admin-curated answers, WhatsApp + contact-form CTAs. New `qa` content section (question/answer/`show`/`public`) edited with the existing admin list machinery. **`show` gates the widget (humans); `show && public` gates the machine surfaces** — llms.txt became a dynamic route rendering the same D1 rows, and the home page emits FAQPage JSON-LD from the same subset; one source of truth, so facts can't drift. Seeds: three public items live; the rates item ships `show:false` with an `R[amount]` placeholder (real figures only in D1, like contact PII). Tests: llms.txt leak guard (a shown-but-private item must never appear) + widget interaction across all six profiles — the suite caught pre-ship that author `display:flex` silently defeats the `hidden` attribute (panel would have been permanently open). *Refinement (Caveshen, same day): on mobile the pill starts minimised as a "?" circle (a tidy column with the FAB) and expands to the labelled pill once the reviews section enters view — the moment rate/booking questions actually form; desktop keeps the full pill throughout.*
15. ✅ *2026-07-13 (e7f4d7f, deployed; first production cron verified firing 00:00 UTC — "Ok", no breaches).* **Zero-cost guardrails + quota sentinel.** (Caveshen, 2026-07-11: "keep this entire project zero-cost… block any spend… alert at 90% of free-tier quotas.") Docs-verified groundwork: Workers/D1/KV/Turnstile/Access/Web Analytics hard-stop on Free (no overage billing exists); **R2 is the only spend vector** (10GB / 1M Class A / 10M Class B per month); no hard spend-cap feature exists. Human layer: payment methods confirmed all-Free (2026-07-12); **Budget Alert $0.10** ✅ 2026-07-11; ~~email onboarding~~ retired (Workers Paid only *and* unnecessary — verified-destination sends are free on all plans; Email Routing already live on the zone; enquiry email confirmed in-inbox from preview 2026-07-12). Sentinel as-built: custom Worker entry `src/worker.ts` (adapter `fetch` + `scheduled()` — the adapter honours a user `main` in wrangler.jsonc and bundles it; stock entry is just `{fetch}`), hourly cron (`0 * * * *`, a free-plan feature; 24 invocations/day against the same 100k quota), `src/lib/sentinel.ts` queries GraphQL Analytics (workersInvocationsAdaptive today / d1AnalyticsAdaptiveGroups today / r2OperationsAdaptiveGroups + r2StorageAdaptiveGroups month-to-date) with read-scoped `ANALYTICS_TOKEN` secret, R2 ops classified by conservative prefix rule (Delete/Abort free, Get/Head/UsageSummary = B, everything else = A so unknowns alert early), alerts at ≥90% of any quota, deduped once per period via `sentinel_alerts` (migration 0005), one free verified-destination email per fresh breach to `ALERT_EMAIL` secret (Caveshen's address, destination-verified 2026-07-12). Never throws — a sentinel failure logs and exits. 5 API tests. *Deliberate omission: no cut-off logic in v1 — nothing can bill, so there's nothing safe to cut; revisit only if R2 storage ever approaches its ceiling (pause admin media uploads, never the public site).* Ops note: the remote D1 migrations ledger only knew 0001–0002 (0003/0004 were applied via `d1 execute`) — backfilled 2026-07-12; use `wrangler d1 migrations apply` from now on. Local cron testing: `wrangler dev --test-scheduled` + `/cdn-cgi/handler/scheduled?cron=…` (the old `/__scheduled` path 404s).
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
6. ✅ *2026-07-12 (found by Caveshen's logged-out test — config, not code).* **Admin login presented the Cloudflare dashboard password page instead of email OTP.** The Access app's only login method was the "Cloudflare" identity provider — newer Zero Trust orgs default to it and no longer auto-add One-time PIN, so the designed email-code flow never existed in config. *Fix (via API; token gained Access scopes):* created a `onetimepin` identity provider and set it as the app's sole login method (Cloudflare IdP detached; auto-redirect kept, so the login page goes straight to the email box). Verified logged-out: `/admin` → "Send login code". Allowlist policy untouched. *Lesson:* verify Access login methods from a logged-out session — design intent isn't config.
7. ✅ *2026-07-19 (Leigh's admin testing; root cause found, fix folded into item 18).* **Editing the title in admin doesn't change the site.** The hero `<h1>` is deliberately hardcoded brand lockup — `Disc<Aperture/>ver with Leigh`, the aperture replacing the "o" (with an `sr-only` "o") — so it can't render arbitrary text; only `hero.subtitle` flows from content. But the admin auto-generates an editable field for `hero.title` from the content shape, so the edit saves to D1 and silently goes nowhere. (`meta.title`, the browser-tab/OG title, *does* flow — worth confirming with Leigh which she edited.) *Fix with item 18:* remove `hero.title` from the shape (or render it), plus the round-trip tests that make this class of bug impossible to reintroduce.

---

# Reference

## AI & search discoverability (feedback 2026-07-06)

The site should be findable and summarisable by search engines *and* LLM crawlers — the goal is appearing when someone asks an assistant for photographers / digital marketers in Cape Town. Welcome crawlers; block nothing that reads politely. What we prevent is abuse, not access (Cloudflare's free unmetered DDoS protection + the WAF rate-limit at cutover).

Implemented: robots.txt (allow all, disallow /admin + /api, sitemap reference), /llms.txt business summary (de-PII'd; becomes dynamic with item 13), JSON-LD ProfessionalService on the homepage, sitemap.xml. At cutover: AI Crawl Control → ALLOW (step 6), search registration (step 8).

## Non-goals (v1)

Blog, e-commerce, live Instagram API (deprecated by Meta; the gallery is curated via admin instead), whole-section admin management (deferred by decision), Workers AI chat (item 13 maybe-later).

## Plan B: admin auth without Zero Trust (parked, 2026-07-11 — explicitly not a today thing)

Context: the Zero Trust Free plan is why a payment method must stay on the account (it can't be removed while the subscription is active). If we ever want the card gone, Access goes too — this is the sketch of what replaces it:

- **Swap point is already narrow:** `src/middleware.ts` is the single auth chokepoint. Replace the `Cf-Access-Jwt-Assertion` validation with a self-managed session check; the admin pages and API routes need no changes.
- **Shape:** login page → password verified against a salted hash in a Worker secret → signed session cookie (WebCrypto HMAC, HttpOnly/Secure/SameSite=Strict, short TTL). Turnstile on the login form; failed-attempt counter in D1 (the metrics pattern) for lockout. Optional TOTP is ~30 lines of WebCrypto if wanted — no new dependencies either way.
- **Trade-offs, stated plainly:** we'd own the auth security that Access currently provides for free (email OTP, Cloudflare's hardening, session management, an audit log). Two users (Leigh + Caveshen) makes the surface small, but Access is strictly stronger. The only prize is removing the payment method — and R2 would still be the spend vector regardless, so the zero-cost posture barely improves.
- **Variants considered (2026-07-11):** (a) *Auth.js + D1 adapter + email allowlist* — magic-link login for the two admins; works, but it reimplements Access's email-OTP with a large fast-churning dependency we'd maintain — the strongest variant if staying email-based, and also the best argument for keeping Access. (b) *Creds in D1 + Cloudflare damping* — leaner; note the free plan has exactly **one** WAF rate-limiting rule (currently earmarked for general abuse at cutover — it can't cover both) and the 10ms CPU ceiling makes slow KDFs risky → store a high-entropy generated passphrase (cheap hash, brute-force dies against entropy, not hash cost) + Turnstile on the login + D1 lockout counter.
- **Verdict when parked:** not worth it today; revisit only if Zero Trust's terms change or the card-on-file requirement starts to grate.

## Phases

1. ✅ **Scaffold** — Astro + Wrangler deploying to a preview URL.
2. ✅ **Public site** — the one-pager, dark/teal, images migrated.
3. ✅ **Working form** — Turnstile + Email Sending + D1.
4. ✅ **Admin panel** — Cloudflare Access, content editing, gallery upload, enquiry list.
5. ⏳ **Cutover** — see the runbook above.

Preview: https://preview.discoverwithleigh.co.za (custom domain; workers.dev disabled; live apex untouched until cutover).
