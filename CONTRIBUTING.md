# Contributing

This is the working repository of a small personal business's website. Issues and
suggestions are welcome; pull requests by prior arrangement.

## House rules

1. **Both suites green before any commit** — `npm test` and `npx playwright test`.
   Bug fixes come with a regression test.
2. **No PII, secrets, or tokens in tracked files.** Contact details, rates, and
   similar live only in D1 (edited via the admin); credentials live only in Worker
   secrets or local `.dev.vars`. Source and docs use placeholders.
3. **Keep it lean and free.** The stack deliberately runs on Cloudflare's free tier
   with near-zero dependencies — no new runtime dependency, service, or paid feature
   without a strong, argued case.
4. **Match the existing style.** Surgical diffs; don't refactor what isn't broken.
5. **Features are reviewed on a local dev run before commit and deploy**; bug fixes
   may go straight through.
6. **Content is not code.** Copy, Q&A answers, gallery images, brand tiles, and
   social links are edited in the admin, not in the repository.

Setup, tests, and deploy commands are in the [README](README.md); the living spec is
`docs/PRD.md`.
