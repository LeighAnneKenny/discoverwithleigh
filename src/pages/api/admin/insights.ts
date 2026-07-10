import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

// Insights data for the admin tab (PRD item 11): behaviour counters from the
// bounded metrics table plus the enquiry funnel derived from existing rows.
// Auth is the /api/admin middleware, same as the other admin routes.
export const GET: APIRoute = async ({ url }) => {
  const days = url.searchParams.get('days') === '30' ? 30 : 7;
  const since = `-${days - 1} day`;

  const [metrics, enquiries] = await Promise.all([
    env.DB.prepare("SELECT day, metric, count FROM metrics WHERE day >= date('now', ?) ORDER BY day").bind(since).all(),
    env.DB.prepare(
      "SELECT date(created_at) AS day, COUNT(*) AS count FROM enquiries WHERE date(created_at) >= date('now', ?) GROUP BY day ORDER BY day",
    )
      .bind(since)
      .all(),
  ]);

  return Response.json({ days, metrics: metrics.results, enquiries: enquiries.results });
};
