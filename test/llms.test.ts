import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { GET } from '../src/pages/llms.txt';

const putRow = (key: string, value: unknown) =>
  env.DB.prepare('INSERT INTO content (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(key, JSON.stringify(value))
    .run();

const fetchText = async () => {
  const res = await (GET as any)({});
  expect(res.status).toBe(200);
  return res.text() as Promise<string>;
};

beforeAll(async () => {
  const { applyMigrations } = await import('./helpers');
  await applyMigrations();
});
beforeEach(() => env.DB.prepare('DELETE FROM content').run());

describe('llms.txt sensitivity split (PRD item 13)', () => {
  it('renders public+shown items from the defaults', async () => {
    const text = await fetchText();
    expect(text).toContain('## Quick answers');
    expect(text).toContain('Where are you based');
    // the rates seed is public:false (and hidden) — must not leak
    expect(text).not.toContain('cost');
  });

  it('never leaks public:false items, even when shown in the widget', async () => {
    await putRow('qa', [
      { question: 'What are your rates?', answer: 'Secret rates from R999.', show: true, public: false },
      { question: 'Do you shoot weddings?', answer: 'Yes, all over the Cape.', show: true, public: true },
    ]);
    const text = await fetchText();
    expect(text).toContain('Do you shoot weddings?');
    expect(text).not.toContain('rates');
    expect(text).not.toContain('R999');
  });

  it('omits the section entirely when nothing is public', async () => {
    await putRow('qa', [{ question: 'Q', answer: 'A', show: true, public: false }]);
    const text = await fetchText();
    expect(text).not.toContain('## Quick answers');
    expect(text).toContain('## Contact'); // base content intact
  });
});
