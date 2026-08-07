# Discover With Leigh

The website of [Discover With Leigh](https://discoverwithleigh.co.za/) — Leigh-Anne Kenny,
photographer and digital marketing specialist in Century City, Cape Town.

Built to run **entirely on Cloudflare's free tier**: an [Astro](https://astro.build/) site
rendered per-request by a Cloudflare Worker, with content in D1, images in R2, and no paid
services anywhere. Zero cost is a design constraint, not an accident (see `docs/PRD.md`,
item 15).

## How it works

- **Rendering** — every page is server-rendered by the Worker on each request: content rows
  from D1 are one-level-merged over the defaults in `src/data/site.ts`, so admin edits are
  live within minutes with no build step and no cache layer.
- **Admin** — `/admin` sits behind Cloudflare Access (OTP login) *and* JWT validation in
  `src/middleware.ts` (defence in depth, fail closed). Every content section, the gallery
  (R2), brands, enquiries, and a usage-insights tab are editable/visible there.
- **Contact form** — Turnstile-verified, honeypot-guarded; enquiries are stored in D1
  first and emailed via Cloudflare Email Sending second (email is best-effort, storage is
  not).
- **Machines welcome** — `/llms.txt` is a dynamic route publishing curated public facts
  (the same D1 rows the on-site Q&A widget renders), plus FAQ/ProfessionalService JSON-LD.
- **Insights** — a privacy-clean behaviour beacon (one `sendBeacon` per visit, no cookies,
  no identifiers) feeds a bounded D1 counters table (~500 rows, self-pruning).

## Local development

```sh
npm install
npm approve-scripts workerd && npm rebuild workerd   # one-time postinstall approval

# local D1: apply migrations, then seed
for f in migrations/*.sql; do npx wrangler d1 execute discoverwithleigh --local --file "$f"; done
node scripts/seed.ts

npm run build
npx wrangler dev --port 8788 --host localhost
```

`--host localhost` matters: the admin's local-dev auth bypass is loopback-gated.
Note that `npm run dev` (Astro's dev server) currently 500s on admin routes — an upstream
bug in its workerd runner; use the build + `wrangler dev` flow above.

## Tests

```sh
npm test              # API suite — vitest running inside workerd against a real local D1
npx playwright test   # UI suite — 6 device profiles (desktop 1080p/1440p/4K, iPhone, Galaxy)
                       # plus a round-trip project (admin edit → rendered page); boots its own server
```

## Deploying

CI (GitHub Actions) runs both suites on every push and deploys `main` automatically.
Manual deploy: `npm run build && npx wrangler deploy --config dist\server\wrangler.json`.
D1 migrations are applied to the remote database explicitly (`wrangler d1 execute
discoverwithleigh --remote --file ...`) before deploying code that depends on them.

## Repository guide

| Path | Purpose |
|---|---|
| `docs/PRD.md` | The living spec — vision, decisions, runbook, shipped record |
| `src/data/site.ts` | Canonical content shape + defaults (D1 rows override at runtime) |
| `src/middleware.ts` | Admin auth + legacy WordPress redirects |
| `migrations/` | D1 schema, applied local **and** remote |
| `scripts/` | D1 seed + brand-image pre-optimizer |
| `test/`, `e2e/` | API suite (workerd) and Playwright UI suite |

House rules for changes are in [CONTRIBUTING.md](CONTRIBUTING.md).
