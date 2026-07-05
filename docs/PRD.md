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
| Enquiry email | Resend free tier (+ D1 as backup, visible in admin) |
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

## Brand mark fidelity (feedback, 2026-07-05)

The current header/hero uses a hand-drawn approximation of the logo's aperture device. Requirement: capture the existing logo as faithfully as possible — preferably by tracing the original (`src/assets/logo.png` / the aperture favicon) into a true SVG — so the mark is identical to the brand asset and can be animated on initial page load (e.g. iris blades opening). Fallback: a cleaned-up raster with a CSS-animated reveal.

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
- Resend domain verification: two DNS records in Cloudflare DNS (before enquiry email goes live).
