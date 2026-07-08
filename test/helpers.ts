import { env } from 'cloudflare:test';
import m1 from '../migrations/0001_enquiries.sql?raw';
import m2 from '../migrations/0002_content.sql?raw';
import m3 from '../migrations/0003_brands_meta.sql?raw';

// The real migrations, statement by statement, against the test D1.
export async function applyMigrations() {
  for (const file of [m1, m2, m3]) {
    for (const stmt of file.split(';').map((s) => s.trim()).filter(Boolean)) {
      await env.DB.prepare(stmt).run();
    }
  }
}

// Astro's redirect() helper, as the API routes receive it.
export const redirect = (path: string, status = 302) =>
  new Response(null, { status, headers: { Location: path } });
