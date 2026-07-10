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
npm test                                                  # 29 API tests, vitest-in-workerd
npx playwright test                                       # 78 UI tests, 6 device profiles
npm run build && npx wrangler dev --port 8788 --host localhost   # local dev (see gotchas)
npx wrangler deploy --config dist\server\wrangler.json    # deploy (after build; token env var above)
npx wrangler d1 execute discoverwithleigh --local --file migrations/000X.sql   # + --remote before deploying dependent code
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
