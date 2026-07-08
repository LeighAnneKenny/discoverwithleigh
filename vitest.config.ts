import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';

// Bindings are declared inline (not via wrangler.jsonc) so tests never depend
// on a built dist/ or touch real resources — every test gets isolated storage.
export default defineConfig({
  plugins: [
    cloudflareTest({
      miniflare: {
        compatibilityDate: '2026-07-05',
        compatibilityFlags: ['nodejs_compat'],
        d1Databases: ['DB'],
        r2Buckets: ['MEDIA'],
        bindings: {
          ACCESS_TEAM_DOMAIN: 'https://team.test.example',
          ACCESS_AUD: 'test-aud',
          TURNSTILE_SECRET: 'test-secret',
        },
      },
    }),
  ],
  resolve: {
    alias: {
      // Astro virtual module; defineMiddleware is identity at runtime.
      'astro:middleware': fileURLToPath(new URL('./test/stubs/astro-middleware.ts', import.meta.url)),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
