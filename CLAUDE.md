# CLAUDE.md — operational notes for this repository

`docs/PRD.md` is the source of truth: vision, decisions, the cutover runbook, and the
shipped record. Item numbers are stable IDs — never renumber.

## Standing rules

- **No PII, secrets, or tokens in tracked files or docs** — placeholders only. Real
  contact details and rates live in D1 (admin-edited); credentials live in Worker
  secrets / `.dev.vars`.
- **Only the DWL Cloudflare account.** The deploy token is read per-command from the
  Machine-scope env var `CLOUDFLARE_API_TOKEN_DWL` — never print it:
  `$env:CLOUDFLARE_API_TOKEN = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN_DWL','Machine')`
- **Features demo on local dev before commit + deploy** (Caveshen approves first);
  bug fixes may go straight through.
- **Zero cost is a requirement** (PRD item 15): free tier only; no new services or
  dependencies without a strong case.

## Commands

```sh
npm test                                                  # API tests, vitest-in-workerd
npx playwright test                                       # UI tests, 6 device profiles + round-trip project
npm run build && npx wrangler dev --port 8788 --host localhost   # local dev (see gotchas)
npx wrangler deploy --config dist\server\wrangler.json    # deploy (after build; token env var above)
npx wrangler d1 migrations apply discoverwithleigh --local   # + --remote before deploying dependent code (ledger backfilled 2026-07-12 — use this, not d1 execute --file)
```

## Gotchas that will bite you

- `wrangler dev` **needs `--host localhost`** — the admin auth bypass is loopback-gated.
- Astro's own dev server (`npm run dev`) 500s on all admin routes (upstream workerd
  runner bug) — don't chase it; use build + wrangler dev.
- **Kill stray `workerd`/wrangler processes before rebuilding** — they hold
  `dist\client` and the build fails with EPERM.
- `astro:assets` `<Image>` is a **passthrough placebo** here: pages are server-rendered
  and the adapter only optimizes prerendered routes. Use pre-optimized static variants —
  regenerate with `node scripts/optimize-images.mjs` when brand assets change.
- New D1 content section = shape entry in `src/lib/content.ts` + `LABELS` entry in
  `src/pages/admin/index.astro` + defaults in `src/data/site.ts`; the admin's generic
  list machinery does the rest. Migrations go in `migrations/` and must be applied
  local **and** remote, plus imported in `test/helpers.ts`.
- The Worker entry is custom (`src/worker.ts` — adapter fetch + `scheduled()` for the
  quota sentinel). Test the cron locally with `wrangler dev --test-scheduled` and
  `curl http://localhost:8788/cdn-cgi/handler/scheduled?cron=0+*+*+*+*` (the old
  `/__scheduled` path 404s). Sentinel secrets: `ANALYTICS_TOKEN`, `ALERT_EMAIL`.
- The aperture mark's geometry is **frozen** (signed off) — everything inside r≤48 in
  `src/components/Aperture.astro` is verbatim; regenerate blade extensions only with
  `e2e-artifacts/aperture-extend.mjs` and only if the mark is retuned.

## CSS/UI rules learned the hard way

- Always `minmax(0, 1fr)` / `min-width: 0` on grid tracks or flex children holding
  intrinsically-wide content (two shipped bugs came from this).
- Styling `display` on an element toggled with the `hidden` attribute silently defeats
  it — pair with `[hidden] { display: none }`.
- iPhone DPR3 full-page screenshots need `scale: 'css'` (32767px capture cap).
- Don't put transforms on tiles whose seams are faked with gap+background (hairlines
  vanish at fractional display scaling); QA hairlines with `--force-device-scale-factor=1.25`.
- Android tap-highlight paints tapped `<summary>` blocks — `-webkit-tap-highlight-color: transparent`.
- A `* { margin: 0 }` reset silently kills the UA's `dialog { margin: auto }` and pins a
  native `<dialog>` to the top-left. Restore it globally and keep the centring test.
- Match a new hover effect's scope to the existing hover behaviour's scope — a per-row
  rule beside a marquee-wide pause rule froze one row and lit the other.
- Ask about force-dark browser extensions before repainting colour work. A "brown
  background" bug once turned out to be Dark Reader re-tinting the page.

## Working practices

- **Verify a reviewer's claim by experiment before acting on it.** One review was right
  that a rule was dead code and wrong about the fix, and wrong to doubt a test's
  `emulateMedia({ reducedMotion })` call — deleting it makes `scrollIntoViewIfNeeded`
  time out chasing the marquee.
- **PRD status lines flatter themselves.** A shipped item claimed UI coverage it never
  had; check the spec files, not the status note.
- `wrangler secret put` intermittently fails with "malformed response" (API 522) — retry.
