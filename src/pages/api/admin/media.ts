import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

// One endpoint for both media tables; ?table=gallery|brands
const TABLES = { gallery: 'gallery', brands: 'brands' } as const;
const table = (url: URL) => TABLES[url.searchParams.get('table') as keyof typeof TABLES];

export const GET: APIRoute = async ({ url }) => {
  const t = table(url);
  if (!t) return new Response('Bad request', { status: 400 });
  const { results } = await env.DB.prepare(
    `SELECT id, r2_key, ${t === 'gallery' ? 'categories,' : 'label, enabled,'} sort, w, h FROM ${t} ORDER BY sort`,
  ).all();
  return Response.json(results);
};

export const POST: APIRoute = async ({ url, request }) => {
  const t = table(url);
  if (!t) return new Response('Bad request', { status: 400 });
  const form = await request.formData();
  const file = form.get('file');
  const w = Number(form.get('w'));
  const h = Number(form.get('h'));
  if (!(file instanceof File) || !file.type.startsWith('image/') || !w || !h) {
    return new Response('Bad request', { status: 400 });
  }
  const safeName = file.name.replace(/[^\w.-]/g, '_').slice(-80);
  const key = `${t}/${Date.now()}-${safeName}`;
  await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } });

  if (t === 'gallery') {
    const categories = String(form.get('categories') ?? '[]');
    JSON.parse(categories); // validate
    await env.DB.prepare(
      'INSERT INTO gallery (r2_key, categories, sort, w, h) VALUES (?, ?, (SELECT COALESCE(MAX(sort),0)+1 FROM gallery), ?, ?)',
    ).bind(key, categories, w, h).run();
  } else {
    await env.DB.prepare('INSERT INTO brands (r2_key, sort, w, h) VALUES (?, (SELECT COALESCE(MAX(sort),0)+1 FROM brands), ?, ?)')
      .bind(key, w, h).run();
  }
  return Response.json({ ok: true, r2_key: key });
};

export const PATCH: APIRoute = async ({ url, request }) => {
  const t = table(url);
  if (!t) return new Response('Bad request', { status: 400 });
  const body = (await request.json()) as {
    order?: number[];
    id?: number;
    categories?: string[];
    label?: string;
    enabled?: boolean;
  };

  if (body.order) {
    const stmts = body.order.map((id, i) => env.DB.prepare(`UPDATE ${t} SET sort = ? WHERE id = ?`).bind(i, id));
    await env.DB.batch(stmts);
  } else if (t === 'gallery' && body.id && Array.isArray(body.categories)) {
    await env.DB.prepare('UPDATE gallery SET categories = ? WHERE id = ?').bind(JSON.stringify(body.categories), body.id).run();
  } else if (t === 'brands' && body.id && typeof body.label === 'string') {
    await env.DB.prepare('UPDATE brands SET label = ? WHERE id = ?').bind(body.label, body.id).run();
  } else if (t === 'brands' && body.id && typeof body.enabled === 'boolean') {
    await env.DB.prepare('UPDATE brands SET enabled = ? WHERE id = ?').bind(body.enabled ? 1 : 0, body.id).run();
  } else {
    return new Response('Bad request', { status: 400 });
  }
  return Response.json({ ok: true });
};

export const DELETE: APIRoute = async ({ url }) => {
  const t = table(url);
  const id = Number(url.searchParams.get('id'));
  if (!t || !id) return new Response('Bad request', { status: 400 });
  const row = await env.DB.prepare(`SELECT r2_key FROM ${t} WHERE id = ?`).bind(id).first<{ r2_key: string }>();
  if (!row) return new Response('Not found', { status: 404 });
  await env.DB.prepare(`DELETE FROM ${t} WHERE id = ?`).bind(id).run();
  await env.MEDIA.delete(row.r2_key);
  return Response.json({ ok: true });
};
