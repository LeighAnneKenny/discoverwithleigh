// Custom Worker entry: the Astro adapter's fetch handler plus a scheduled()
// handler for the quota sentinel's hourly cron (PRD item 15).
// wrangler.jsonc `main` points here; the adapter bundles it in place of its
// stock entry (`@astrojs/cloudflare/entrypoints/server`, which is just { fetch }).
import server from '@astrojs/cloudflare/entrypoints/server';
import { runSentinel, type SentinelEnv } from './lib/sentinel';

export default {
  fetch: server.fetch,
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(runSentinel(env as unknown as SentinelEnv));
  },
} satisfies ExportedHandler<Env>;
