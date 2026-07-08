# PRD — Discover With Leigh v2

**Date:** 2026-07-05 · **Status:** Approved

## Vision

Replace the static WordPress/Divi export with a fast, owned, editable site — same brand, same content, same URL — where Leigh-Anne manages content herself and nothing silently rots.

## Problems with the current site

1. **Dead contact form** — the static export severed WPForms from its backend; the form posts to `index.html` and discards submissions.
2. **Frozen social feeds** — Instagram/TikTok sections are snapshots from export day.
3. **Bloat** — 656KB of HTML for one page (every section duplicated for desktop/mobile), 61MB repo.
4. **No content control** — any copy change requires re-exporting from WordPress.

## Stack (all Cloudflare free tier)

| Concern | Choice |
|---|---|
| Framework | Astro (`src/` → `dist/`), non-destructive alongside the old export until cutover |
| Hosting | Cloudflare Worker — edge-renders the public page from D1, cached at the edge, cache purged on admin save |
| Content store | D1 (copy, testimonials, gallery metadata, brand logos, enquiries) |
| Images | R2, resized on upload |
| Admin auth | Cloudflare Access on `/admin` |
| Spam protection | Cloudflare Turnstile |
| Enquiry email | Cloudflare Email Sending — Worker binding, no third party. Sends to Leigh's verified destination address are quota-free on all plans. (Supersedes Resend, 2026-07-05.) |
| CI/CD | GitHub Actions → `wrangler deploy` on push to main |

## Brand

Dark/black backgrounds, white text, teal accent `#00a79d`, white logo with teal aperture. Headings: custom "Vogue Sans" (`wp-content/uploads/et-fonts/vogue-sans-medium.ttf`). Body: Montserrat / Nunito Sans / Open Sans.

## Content inventory (from current site)

Hero → About → Services overview → Photography (filterable gallery: Product / Lifestyle / Portraits / Live Music / Property / Weddings) → Video (TikTok) → Social Media Management (4-step Discovery Process) → Influencer Campaigns → Client Reviews (4 testimonials) → Brand logos (8) → Contact (details, form, WhatsApp CTA) → Privacy Policy page.

## Use cases & success criteria

| # | Use case | Success criteria |
|---|---|---|
| 1 | Visitor browses portfolio on mobile | Lighthouse ≥ 90 all categories; LCP < 2.5s |
| 2 | Visitor filters gallery by category | Instant client-side filtering, six categories preserved |
| 3 | Visitor sends an enquiry | Stored in D1, email via Resend lands in Leigh's inbox, Turnstile blocks bots |
| 4 | Visitor taps WhatsApp / social CTAs | All existing links preserved |
| 5 | Admin edits copy, testimonials, brand logos | Login via Cloudflare Access; changes live within minutes, no developer involved |
| 6 | Admin manages gallery | Upload to R2 with category + ordering |
| 7 | Admin reviews enquiries | Submissions list in admin panel |
| 8 | Developer deploys | Push to main → live in < 5 min; rollback = `git revert` |
| 9 | SEO continuity | Same domain, meta/OG tags, sitemap, `/privacy-policy` kept |

## Brand mark fidelity — ✅ SIGNED OFF 2026-07-06

Resolved in design session with Caveshen:
- **Header**: Leigh's original lockup (Celtic knot + aperture centre + wordmark with underlined O + tagline) used 1:1 as a trimmed transparent image (`src/assets/logo-lockup.png`), build-optimised.
- **Footer**: same lockup left-aligned as a signature; legal lines (privacy / copyright / email) stacked right.
- **Hero**: parametric SVG aperture (`Aperture.astro` — blade count, radii, swirl, gap all tunable) as the O in DISCOVER. Approved at **6 blades** (deliberate deviation from the logo's 7). On load it performs a **shutter click**: open → snap closed → reopen, ~2.2s, reduced-motion renders static.
- Light mode will need the dark logo variant (see Next run item 6).

## Admin v2 (feedback, 2026-07-06)

The v1 admin edits existing values only. Wanted next: add/remove items in list content (reviews, services, process steps), and longer-term add/remove/reorder whole sections of the site — scope to be workshopped before build. "We could do A LOT MORE here" — Caveshen.

*Workshopped and shipped 2026-07-07:* every array in the content forms now has per-item move/remove and an Add button (new item = blanked clone of the list's shape) — covers reviews, services, process steps, about paragraphs and the TikTok pool in one generic mechanism. Booleans render as checkboxes. **Whole-section add/remove/reorder: deferred entirely** (decision 2026-07-07 — sections are bespoke components, a developer is needed regardless; revisit if a real need appears).

*Dev note:* local admin requires `npx wrangler dev --host localhost` — without `--host`, wrangler simulates the production route host and the loopback-only auth bypass (correctly) refuses. Astro 7's own dev daemon (`npm run dev`) currently 500s on all admin routes — upstream logger bug in its workerd runner.

## Next run (feedback, 2026-07-06)

1. ✅ *Shipped 2026-07-06.* **Gallery → filterable carousel (mobile-first).** The 53-image masonry punishes phone users: it collapses to one column and forces an enormous scroll between sections. Replace with a CSS scroll-snap horizontal carousel (native swipe on mobile, prev/next arrows on desktop, no carousel library), filter tabs above styled unmistakably as tabs. This also restores the original site's form. *(The filter click-handling bug — author `display:block` overriding the `hidden` attribute — was found and fixed 2026-07-06.)*
2. ✅ *Shipped 2026-07-06.* **Floating WhatsApp CTA.** Reintroduce the bottom-right floating WhatsApp button from the old site, opening a chat with pre-filled message text (e.g. "Hi Leigh-Anne! I found your website and would love to chat about a shoot/campaign.") via wa.me/27722277016?text=…. Message copy editable in admin content.
3. ✅ *Shipped 2026-07-06 (carousel; admin curation pending admin v2).* **TikTok rotation.** *(Revised 2026-07-06 after review: two side-by-side embeds looked cramped.)* Single embed in a swipeable scroll-snap carousel: the pool of video IDs is rotated server-side so each page load *starts* on a random video, then the visitor swipes (arrows on desktop) through the rest. Pool seeded with the newest 8 videos from the live @discover_with_leigh profile + the 2 originals (10 total), stored in D1 `video.tiktokIds`. **Future (admin v2):** the ID pool must be curatable in the admin section — add/remove/reorder IDs without a developer.
4. ✅ *Shipped 2026-07-07 (both parts).* **Brands section v2** *(expanded 2026-07-06; see also Bug fixes #2).* Two-parter:
   - **(a) Bug fix — contain the strip.** Marquee chosen at workshop (2026-07-07): auto-scrolling single row inside standard section width, pause on hover, edge-fade mask, reduced-motion renders static/scrollable. Pure CSS (duplicated track, −50% translate loop).
   - **(b) Enhancement — admin-customisable tiles.** Migration 0003 added `label TEXT` + `enabled INTEGER` to `brands` (applied local + remote); tiles render optional captions and hidden tiles are filtered in SQL; admin Brands cards grew a label field and a Shown/Hidden toggle.
5. 📨 *Handed to Leigh 2026-07-07 — no site code; configured in the WhatsApp Business app on the phone holding the business contact number.* **WhatsApp auto-response.** (Added 2026-07-06.) Two features under Settings → Business tools, official guides:
   - **Greeting message** — https://faq.whatsapp.com/501866148528310 — auto-replies to first-time enquirers (or after 14 days' silence); this is what answers the website FAB's pre-filled message. Set recipients to "Everyone". Draft copy: *"Hi! Thanks for reaching out to Discover With Leigh 📸 I've seen your message and I'll get back to you personally within a few hours — usually much sooner. To speed things along, tell me a bit about what you have in mind: the type of shoot or campaign, and any dates you're eyeing."*
   - **Away message** — https://faq.whatsapp.com/2565868990219715 — out-of-hours cover for repeat enquirers. The "outside business hours" schedule requires business hours set on the profile first. Draft copy: *"Thanks for your message! I'm out on a shoot right now 🎥 — I'll reply as soon as I'm back. If it's urgent, you can also email [the business email]."*
   - **Leigh's decisions:** response-time promise (only promise what she'll keep), away schedule vs always-on, emoji tone, and completing the business profile (hours, description, website link → new site at cutover). The Business Platform/API was considered and rejected — overkill for a one-person studio.
6. ✅ *Shipped 2026-07-06.* **Light mode + theme toggle.** Token swap under `[data-theme="light"]`; default follows `prefers-color-scheme`, choice persisted in localStorage; sun/moon toggle in the top bar. *As-built revisions:* light palette restores the **original WordPress design** (off-white `#faf9f6` body, black bands) rather than inventing one; **header, footer and CTA bands stay dark in both themes** (`.always-dark` token utility) so Leigh's white-on-dark lockup never needs a dark variant; hero pins dark-over-photo colours in both themes; `color-scheme` declared per theme (native controls + polite auto-dark opt-out — note: force-dark browser features/extensions like Dark Reader still re-tint, nothing opts out of those).

## Bug fixes (reported 2026-07-06)

1. **Contact form fields overflow their card on desktop.** Inputs/textarea have no explicit `width`, so their intrinsic default width (~239px, the UA's `size="20"` rendering) acts as an automatic minimum inside the form's CSS grid — `.form-row`'s `1fr 1fr` tracks can't shrink below it. At desktop widths the form column (6fr ≈ 532px) sits just below the threshold, so field rows render ~496px wide in a ~450px content box and punch through the card's right padding/border. Mobile is unaffected (single column = full width). *Fix:* `width: 100%; min-width: 0` on `input, textarea` and `minmax(0, 1fr)` tracks on `.form-row`.
2. ✅ *Fixed 2026-07-07 (marquee — see Next run item 4a).* **Brands strip spans the full window on desktop.** `.brand-strip` deliberately sits outside `.wrap`, so the `auto-fill` grid grows to 12+ tiles per row on wide screens — the only section ignoring the 72rem container convention. Fine on mobile (2–3 columns), sprawling on desktop. *Fix:* contain the strip to standard section width; presentation decision (marquee vs carousel vs capped grid) folded into Next run item 4, which this bug supersedes the "full width becomes intentional" framing of. *(Marquee rationale accepted 2026-07-06; build deferred — not yet greenlit.)*
3. ✅ *Fixed 2026-07-07.* **WhatsApp triple-redundancy in the contact section.** WhatsApp appears three times in one viewport: the "WhatsApp to set up a meeting" CTA button, the text socials list beneath it, and the floating FAB. WhatsApp is a contact channel, not social presence — it doesn't belong in the socials list. *Fix (quick):* drop WhatsApp from the list and replace the remaining text links (TikTok, Instagram, Facebook, YouTube) with standardised inline-SVG platform icons, aria-labelled, teal hover — matching the FAB's hand-inlined-glyph approach. *Admin customisability of the list → Next run item 7.*
4. ✅ *Fixed 2026-07-07 (reveal moved from tiles to the list; verified at 1.25 device scale).* **Discovery Process dividers render inconsistently.** (Reported 2026-07-07.) The seam between tiles 1 and 2 vanishes while 2|3 and 3|4 draw fine. The grid fakes its dividers with `gap: 1px` over a `--line` background (`Marketing.astro`), and each `<li>` is an individual `.reveal` — its `translate` transform promotes the tile to a composited layer snapped to *device* pixels independently of grid layout, so at fractional display scaling a tile can overpaint the 1px gap beside it. Which seams survive is rounding luck. *Fix:* reveal the whole `<ol class="process">` as one block instead of per-tile (deletes the per-tile transforms — root cause); if hairlines still vary at odd zooms, replace the background-bleed technique with real `border` on tiles.

7. ✅ *Shipped 2026-07-07 (with admin v2 list editing, as planned).* **Admin-customisable social links.** (Added 2026-07-06; pairs with Bug fixes #3.) Socials promoted to a `socials` content section (platform name + URL, per-link `show` flag), editable in admin under "Social links"; icons matched by platform name with a text fallback for unrecognised platforms; the homepage JSON-LD `sameAs` derives from the visible links.

8. ✅ *Shipped 2026-07-07 — 19 tests, `npm test`, ~1.5s.* **Unit tests for the API surface.** (Added 2026-07-07 — retro-fit, deliberately.) *As-built:* pool-workers 0.18 (vitest 4) configures via the `cloudflareTest()` Vite plugin (not `defineWorkersConfig`); bindings declared inline in `vitest.config.ts` so tests never depend on `dist/` or real resources; `astro:middleware` aliased to an identity stub; real migrations applied per suite; Turnstile mocked by stubbing global `fetch` (the pool's `fetchMock` was removed in 0.18). Vitest + `@cloudflare/vitest-pool-workers` so tests run in workerd against real D1/R2 bindings. Priority order: middleware auth (fail-closed on missing config, bypass requires flag AND loopback host), `/api/contact` (honeypot, Turnstile fail-closed, required fields, enquiry stored even when email fails), `loadContent` one-level merge, admin media PATCH branching (order vs categories vs label vs enabled). Components stay untested — the visual QA rig covers them. Until this lands, every ship keeps its end-to-end curl verification.

9. **PII out of source.** (Added 2026-07-07.) The business phone and email are *published* on the rendered site by design — this item is about keeping them out of the *repo*, so clones/forks and a future public GitHub carry no PII. Scope:
   - Blank `contact.phone`, `contact.phoneHref` and `contact.email` in `src/data/site.ts` — the live values already exist in the D1 `content` row and stay editable in admin. Fresh environments get seeded blanks and are filled in via admin.
   - `Layout.astro` (footer email) and `privacy-policy.astro` import `contact` from site.ts directly — wire both through `loadContent()`; the privacy page flips to `prerender = false` (no DB at build time).
   - `ENQUIRY_EMAIL` moves from `wrangler.jsonc` vars to a Worker secret (same handling as `TURNSTILE_SECRET`).
   - Docs sweep: keep phone/email out of PRD and README wording (done for item 5, 2026-07-07).
   - **Git history:** values remain in past commits — squash/rewrite history (fresh squash or `git filter-repo`) before the repo is shared or made public; natural moment is cutover, alongside deleting the WordPress export.

## AI & search discoverability (feedback, 2026-07-06)

The site should be findable and summarisable by search engines *and* LLM crawlers — the goal is appearing when someone asks an assistant for photographers / digital marketers in Cape Town. Welcome crawlers; block nothing that reads politely. What we prevent is abuse, not access: no full-site scraping abuse or DDoS (Cloudflare's free unmetered DDoS protection covers the latter; add a WAF rate-limiting rule at cutover).

Implementation: robots.txt (allow all, disallow /admin + /api, sitemap reference), /llms.txt business summary, JSON-LD ProfessionalService structured data on the homepage, sitemap.xml. At cutover: ensure Cloudflare's "Block AI bots" / AI Crawl Control is set to ALLOW AI crawlers on this zone — Cloudflare blocks them by default on newer zones.

## Non-goals (v1)

Blog, e-commerce, live Instagram API (deprecated by Meta; the "recent work" grid is curated via admin instead).

## Phases

1. **Scaffold** — Astro + Wrangler + GH Action deploying to a preview URL. *Verify: preview serves hello-world.*
2. **Public site** — rebuild the one-pager mirroring the dark/teal styling; migrate images. *Verify: side-by-side with live site, Lighthouse ≥ 90.*
3. **Working form** — Turnstile + Resend + D1. *Verify: test submission lands in inbox and D1.*
4. **Admin panel** — Cloudflare Access, content editing, gallery upload, enquiry list. *Verify: edit copy, see it live in seconds.*
5. **Cutover** — point the domain at the Worker, retire the export. *Verify: SEO tags, privacy policy, social links intact.*

## Pending external tasks

- GH repo secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (before first CI deploy).
- ~~Turnstile~~ Done 2026-07-05: real widget live, secret on Worker, enforcement verified.
- Email Sending: onboard `discoverwithleigh.co.za` — dashboard (Email Service → Email Sending → Onboard Domain) or add the zone-level Email permission to the API token. Destination address `discoverwithleigh@gmail.com` registered 2026-07-05; awaiting verification click.
- Preview URL: https://discoverwithleigh.admin-discoverwithleigh.workers.dev (live domain untouched until cutover).
