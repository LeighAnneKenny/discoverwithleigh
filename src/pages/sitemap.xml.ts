import type { APIRoute } from 'astro';

export const prerender = true;

const urls = ['https://discoverwithleigh.co.za/', 'https://discoverwithleigh.co.za/privacy-policy/'];

export const GET: APIRoute = () =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${u}</loc></url>`)
      .join('\n')}\n</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
