import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

// Exact metric names the beacon may increment; prefixed names carry a small
// bounded value (gallery tab names, social platform names) — validated by
// pattern so garbage can't mint unbounded rows.
const EXACT = new Set([
  'visit',
  'fab',
  'form_start',
  'qa_open',
  'section:about',
  'section:photography',
  'section:video',
  'section:marketing',
  'section:influencer',
  'section:reviews',
  'section:brands',
  'section:contact',
]);
const PREFIXED = /^(filter|social):[a-z0-9-]{1,24}$/;

export const POST: APIRoute = async ({ request }) => {
  let names: unknown;
  try {
    names = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!Array.isArray(names)) return new Response(null, { status: 400 });

  const valid = [...new Set(names.filter((n) => typeof n === 'string').map((n) => n.toLowerCase()))]
    .filter((n) => EXACT.has(n) || PREFIXED.test(n))
    .slice(0, 24);
  if (!valid.length) return new Response(null, { status: 204 });

  const upsert = env.DB.prepare(
    "INSERT INTO metrics (day, metric, count) VALUES (date('now'), ?, 1) ON CONFLICT(day, metric) DO UPDATE SET count = count + 1",
  );
  await env.DB.batch([
    ...valid.map((n) => upsert.bind(n)),
    env.DB.prepare("DELETE FROM metrics WHERE day < date('now', '-35 day')"),
  ]);
  return new Response(null, { status: 204 });
};
