import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { POST } from '../src/pages/api/metrics';
import { GET as insights } from '../src/pages/api/admin/insights';
import { applyMigrations } from './helpers';

beforeAll(applyMigrations);
beforeEach(() => env.DB.batch([env.DB.prepare('DELETE FROM metrics'), env.DB.prepare('DELETE FROM enquiries')]));

const beacon = (body: unknown) =>
  (POST as any)({
    request: new Request('https://preview.discoverwithleigh.co.za/api/metrics', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  }) as Promise<Response>;

const rows = async () =>
  (await env.DB.prepare('SELECT metric, count FROM metrics ORDER BY metric').all<{ metric: string; count: number }>())
    .results;

describe('POST /api/metrics', () => {
  it('increments allowlisted metrics, once per name per beacon', async () => {
    expect((await beacon(['visit', 'fab', 'visit'])).status).toBe(204);
    expect(await rows()).toEqual([
      { metric: 'fab', count: 1 },
      { metric: 'visit', count: 1 },
    ]);
    await beacon(['visit']);
    expect(await rows()).toEqual([
      { metric: 'fab', count: 1 },
      { metric: 'visit', count: 2 },
    ]);
  });

  it('drops garbage names so rows stay bounded', async () => {
    await beacon(['hack', 'section:evil', 'filter:'.padEnd(60, 'x'), 'filter:weddings', 'social:tiktok', 42, null]);
    expect((await rows()).map((r) => r.metric)).toEqual(['filter:weddings', 'social:tiktok']);
  });

  it('rejects non-array bodies', async () => {
    expect((await beacon({ visit: 1 })).status).toBe(400);
  });

  it('prunes rows older than 35 days on write', async () => {
    await env.DB.prepare("INSERT INTO metrics (day, metric, count) VALUES (date('now', '-40 day'), 'visit', 9)").run();
    await beacon(['visit']);
    const all = await rows();
    expect(all).toEqual([{ metric: 'visit', count: 1 }]);
  });
});

describe('GET /api/admin/insights', () => {
  it('returns windowed metrics and the enquiry funnel', async () => {
    await beacon(['visit', 'section:contact']);
    await env.DB.prepare(
      "INSERT INTO enquiries (first_name, last_name, email, message) VALUES ('A', 'B', 'a@b.c', 'hi')",
    ).run();
    // outside the 7-day window — must not appear
    await env.DB.prepare(
      "INSERT INTO metrics (day, metric, count) VALUES (date('now', '-20 day'), 'visit', 50)",
    ).run();

    const res = await (insights as any)({ url: new URL('https://x/api/admin/insights?days=7') });
    const data = await res.json();
    expect(data.days).toBe(7);
    expect(data.metrics).toHaveLength(2);
    expect(data.enquiries).toEqual([{ day: expect.any(String), count: 1 }]);

    const wide = await (await (insights as any)({ url: new URL('https://x/api/admin/insights?days=30') })).json();
    expect(wide.metrics.find((m: any) => m.count === 50)).toBeTruthy();
  });
});
