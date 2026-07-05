import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

const KEYS = new Set([
  'meta', 'hero', 'about', 'services', 'photography',
  'video', 'marketing', 'influencer', 'reviews', 'contact',
]);

export const GET: APIRoute = async () => {
  const { results } = await env.DB.prepare('SELECT key, value FROM content').all<{ key: string; value: string }>();
  return Response.json(Object.fromEntries(results.map((r) => [r.key, JSON.parse(r.value)])));
};

export const PUT: APIRoute = async ({ request }) => {
  const { key, value } = (await request.json()) as { key: string; value: unknown };
  if (!KEYS.has(key) || value === undefined) return new Response('Bad request', { status: 400 });
  await env.DB.prepare('INSERT INTO content (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(key, JSON.stringify(value))
    .run();
  return Response.json({ ok: true });
};
