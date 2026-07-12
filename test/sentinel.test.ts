import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach, vi, afterEach } from 'vitest';
import { runSentinel, type SentinelEnv } from '../src/lib/sentinel';
import { applyMigrations } from './helpers';

beforeAll(applyMigrations);
beforeEach(() => env.DB.prepare('DELETE FROM sentinel_alerts').run());
afterEach(() => vi.unstubAllGlobals());

// GraphQL response with the given usage; everything else stays at zero.
const gql = (u: Partial<Record<string, number>>) => ({
  data: {
    viewer: {
      accounts: [
        {
          workers: [{ sum: { requests: u.workers ?? 0 } }],
          d1: [{ sum: { rowsRead: u.rowsRead ?? 0, rowsWritten: u.rowsWritten ?? 0 } }],
          r2ops: [
            { dimensions: { actionType: 'GetObject' }, sum: { requests: u.r2Get ?? 0 } },
            { dimensions: { actionType: 'PutObject' }, sum: { requests: u.r2Put ?? 0 } },
            { dimensions: { actionType: 'DeleteObject' }, sum: { requests: u.r2Del ?? 0 } },
          ],
          r2store: [
            {
              dimensions: { datetime: '2026-07-12T20:40:00Z' },
              max: { payloadSize: u.r2Bytes ?? 0, metadataSize: 0 },
            },
          ],
        },
      ],
    },
  },
  errors: null,
});

const sentinelEnv = (send = vi.fn(async () => ({}))) =>
  ({
    DB: env.DB,
    EMAIL: { send },
    ANALYTICS_TOKEN: 'test-token',
    ALERT_EMAIL: 'alerts@example.com',
    ACCOUNT_ID: 'test-account',
  }) as SentinelEnv;

const stubUsage = (u: Partial<Record<string, number>>) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(gql(u))),
  );

describe('quota sentinel', () => {
  it('stays silent under 90% of every quota', async () => {
    stubUsage({ workers: 89_999, rowsRead: 4_000_000, r2Get: 8_999_999, r2Bytes: 8_000_000_000 });
    const send = vi.fn(async () => ({}));
    await runSentinel(sentinelEnv(send));
    expect(send).not.toHaveBeenCalled();
    const { results } = await env.DB.prepare('SELECT * FROM sentinel_alerts').all();
    expect(results).toEqual([]);
  });

  it('emails once when a quota crosses 90%, then dedupes for the period', async () => {
    stubUsage({ workers: 93_000 });
    const send = vi.fn(async () => ({}));
    const e = sentinelEnv(send);
    await runSentinel(e);
    expect(send).toHaveBeenCalledTimes(1);
    const msg = send.mock.calls[0][0] as any;
    expect(msg.to).toBe('alerts@example.com');
    expect(msg.subject).toContain('Workers requests / day');
    expect(msg.text).toContain('93');

    await runSentinel(e); // next hourly run, same breach
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('classifies R2 ops: Put→A alerts, Delete stays free', async () => {
    // 950k Puts breach Class A (1M); 950k Deletes must not.
    stubUsage({ r2Del: 950_000 });
    const send = vi.fn(async () => ({}));
    await runSentinel(sentinelEnv(send));
    expect(send).not.toHaveBeenCalled();

    stubUsage({ r2Put: 950_000 });
    await runSentinel(sentinelEnv(send));
    expect(send).toHaveBeenCalledTimes(1);
    expect((send.mock.calls[0][0] as any).subject).toContain('R2 Class A');
  });

  it('a new period alerts again, and one email covers multiple fresh breaches', async () => {
    stubUsage({ workers: 95_000, rowsWritten: 91_000 });
    const send = vi.fn(async () => ({}));
    const e = sentinelEnv(send);
    await runSentinel(e, new Date('2026-07-12T21:00:00Z'));
    expect(send).toHaveBeenCalledTimes(1);
    expect((send.mock.calls[0][0] as any).text).toContain('Workers requests');
    expect((send.mock.calls[0][0] as any).text).toContain('D1 rows written');

    await runSentinel(e, new Date('2026-07-13T00:00:00Z')); // new day, new period
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('never throws when GraphQL fails, and sends nothing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ data: null, errors: [{ message: 'boom' }] })),
    );
    const send = vi.fn(async () => ({}));
    await expect(runSentinel(sentinelEnv(send))).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });
});
