// Quota sentinel (PRD item 15): hourly cron → GraphQL usage check → email
// Caveshen when any free-tier quota crosses 90%. Alerts are availability
// protection as much as cost protection — hitting the Workers cap takes the
// site down (Error 1027) even though it can't bill.
//
// Free-tier ceilings verified against Cloudflare docs 2026-07-12.
// Sends are free: ALERT_EMAIL must be a verified destination address.

export type SentinelEnv = {
  DB: D1Database;
  EMAIL: { send(msg: Record<string, unknown>): Promise<unknown> };
  ANALYTICS_TOKEN: string; // read-scoped Account Analytics token (Worker secret)
  ALERT_EMAIL: string; // verified destination address (Worker secret — PII)
  ACCOUNT_ID: string;
};

const ALERT_AT = 0.9;

const QUOTAS = {
  // per day (UTC)
  workers_requests: { limit: 100_000, label: 'Workers requests / day' },
  d1_rows_read: { limit: 5_000_000, label: 'D1 rows read / day' },
  d1_rows_written: { limit: 100_000, label: 'D1 rows written / day' },
  // per calendar month
  r2_class_a: { limit: 1_000_000, label: 'R2 Class A ops / month' },
  r2_class_b: { limit: 10_000_000, label: 'R2 Class B ops / month' },
  r2_storage_bytes: { limit: 10_000_000_000, label: 'R2 storage (bytes)' },
} as const;

type QuotaName = keyof typeof QUOTAS;
const DAILY: QuotaName[] = ['workers_requests', 'd1_rows_read', 'd1_rows_written'];

// Delete/abort ops are free; Get/Head/UsageSummary are Class B; everything
// else (Put/Copy/List/multipart/...) counts as the pricier Class A — unknown
// action types deliberately land in A so misclassification alerts early.
function r2Class(actionType: string): 'a' | 'b' | null {
  if (/^(Delete|Abort)/.test(actionType)) return null;
  if (/^(Get|Head|UsageSummary)/.test(actionType)) return 'b';
  return 'a';
}

const QUERY = `query Sentinel($account: string!, $today: Date!, $monthStart: Time!, $now: Time!) {
  viewer { accounts(filter: {accountTag: $account}) {
    workers: workersInvocationsAdaptive(limit: 10, filter: {date: $today}) { sum { requests } }
    d1: d1AnalyticsAdaptiveGroups(limit: 10, filter: {date: $today}) { sum { rowsRead rowsWritten } }
    r2ops: r2OperationsAdaptiveGroups(limit: 100, filter: {datetime_geq: $monthStart, datetime_leq: $now}) { sum { requests } dimensions { actionType } }
    r2store: r2StorageAdaptiveGroups(limit: 1, filter: {datetime_geq: $monthStart, datetime_leq: $now}, orderBy: [datetime_DESC]) { max { payloadSize metadataSize } dimensions { datetime } }
  } }
}`;

export async function fetchUsage(env: SentinelEnv, now: Date): Promise<Record<QuotaName, number>> {
  const today = now.toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01T00:00:00Z`;
  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.ANALYTICS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: QUERY,
      variables: { account: env.ACCOUNT_ID, today, monthStart, now: now.toISOString() },
    }),
  });
  const body = (await res.json()) as {
    data?: { viewer: { accounts: Array<Record<string, any>> } };
    errors: Array<{ message: string }> | null;
  };
  if (!res.ok || body.errors?.length || !body.data?.viewer.accounts.length) {
    throw new Error(`sentinel graphql failed: ${res.status} ${body.errors?.[0]?.message ?? ''}`);
  }
  const acc = body.data.viewer.accounts[0];
  const sum = (rows: Array<{ sum: Record<string, number> }>, field: string) =>
    (rows ?? []).reduce((t, r) => t + (r.sum?.[field] ?? 0), 0);
  let r2a = 0;
  let r2b = 0;
  for (const row of acc.r2ops ?? []) {
    const cls = r2Class(row.dimensions.actionType);
    if (cls === 'a') r2a += row.sum.requests;
    if (cls === 'b') r2b += row.sum.requests;
  }
  const store = acc.r2store?.[0]?.max;
  return {
    workers_requests: sum(acc.workers, 'requests'),
    d1_rows_read: sum(acc.d1, 'rowsRead'),
    d1_rows_written: sum(acc.d1, 'rowsWritten'),
    r2_class_a: r2a,
    r2_class_b: r2b,
    r2_storage_bytes: (store?.payloadSize ?? 0) + (store?.metadataSize ?? 0),
  };
}

export async function runSentinel(env: SentinelEnv, now = new Date()): Promise<void> {
  try {
    const usage = await fetchUsage(env, now);
    const today = now.toISOString().slice(0, 10);

    const breaches = (Object.keys(QUOTAS) as QuotaName[])
      .filter((q) => usage[q] >= QUOTAS[q].limit * ALERT_AT)
      .map((q) => ({
        quota: q,
        period: DAILY.includes(q) ? today : today.slice(0, 7),
        used: usage[q],
        limit: QUOTAS[q].limit,
        label: QUOTAS[q].label,
      }));
    if (!breaches.length) return;

    // Alert only on quotas not yet recorded for their period (meta.changes
    // tells us whether OR IGNORE actually inserted). Expired periods dedupe
    // themselves — a new day/month is a new period key.
    const fresh = [];
    for (const b of breaches) {
      const r = await env.DB.prepare(
        'INSERT OR IGNORE INTO sentinel_alerts (period, quota) VALUES (?, ?)',
      )
        .bind(b.period, b.quota)
        .run();
      if (r.meta.changes > 0) fresh.push(b);
    }
    await env.DB.prepare("DELETE FROM sentinel_alerts WHERE period < date('now', '-40 day')")
      .run()
      .catch(() => {});
    if (!fresh.length) return;

    const lines = fresh.map(
      (b) =>
        `- ${b.label}: ${b.used.toLocaleString('en-ZA')} of ${b.limit.toLocaleString('en-ZA')} (${Math.round((b.used / b.limit) * 100)}%)`,
    );
    await env.EMAIL.send({
      to: env.ALERT_EMAIL,
      from: { email: 'sentinel@discoverwithleigh.co.za', name: 'DWL Quota Sentinel' },
      subject: `Quota alert: ${fresh.map((b) => b.label).join(', ')}`,
      text: [
        'The following Cloudflare free-tier quotas have crossed 90%:',
        '',
        ...lines,
        '',
        'Nothing can bill (Free plan hard-stops), but hitting the Workers cap takes the site down until the daily reset (00:00 UTC).',
        'Usage: https://dash.cloudflare.com/ → Workers & Pages / D1 / R2 metrics.',
      ].join('\n'),
    });
  } catch (err) {
    // The sentinel must never take anything down with it.
    console.error('quota sentinel run failed', err);
  }
}
