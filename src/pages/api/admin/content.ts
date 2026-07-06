import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { loadContent } from '../../../lib/content';

export const prerender = false;

const KEYS = new Set([
  'meta', 'hero', 'about', 'services', 'photography',
  'video', 'marketing', 'influencer', 'reviews', 'contact',
]);

// Merged over site.ts defaults so newly added default fields show up in the form.
export const GET: APIRoute = async () => Response.json(await loadContent());

export const PUT: APIRoute = async ({ request }) => {
  const { key, value } = (await request.json()) as { key: string; value: unknown };
  if (!KEYS.has(key) || value === undefined) return new Response('Bad request', { status: 400 });
  await env.DB.prepare('INSERT INTO content (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(key, JSON.stringify(value))
    .run();
  return Response.json({ ok: true });
};
