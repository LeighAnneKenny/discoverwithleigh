import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

export const GET: APIRoute = async () => {
  const { results } = await env.DB.prepare(
    'SELECT id, first_name, last_name, email, phone, message, created_at FROM enquiries ORDER BY id DESC LIMIT 200',
  ).all();
  return Response.json(results);
};
