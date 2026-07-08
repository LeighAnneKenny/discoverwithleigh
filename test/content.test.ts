import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadContent, contentKeys } from '../src/lib/content';
import * as defaults from '../src/data/site';

const putRow = (key: string, value: unknown) =>
  env.DB.prepare('INSERT INTO content (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(key, JSON.stringify(value))
    .run();

beforeAll(async () => {
  const { applyMigrations } = await import('./helpers');
  await applyMigrations();
});
beforeEach(() => env.DB.prepare('DELETE FROM content').run());

describe('loadContent', () => {
  it('returns site.ts defaults when D1 is empty', async () => {
    const c = await loadContent();
    expect(c.hero.title).toBe(defaults.hero.title);
    expect(c.socials).toEqual(defaults.socials);
  });

  it('merges D1 object rows over defaults one level deep', async () => {
    await putRow('contact', { phone: '+00 000 0000' }); // stale row missing newer fields
    const c = await loadContent();
    expect(c.contact.phone).toBe('+00 000 0000');
    // field added to defaults after the row was written still survives
    expect(c.contact.whatsappMessage).toBe(defaults.contact.whatsappMessage);
  });

  it('replaces defaults wholesale for array rows', async () => {
    await putRow('reviews', [{ quote: 'only one', name: 'A', org: '' }]);
    const c = await loadContent();
    expect(c.reviews).toHaveLength(1);
    expect((c.reviews as any)[0].quote).toBe('only one');
  });

  it('contentKeys mirrors the shape (the admin PUT allowlist)', () => {
    expect(contentKeys.has('socials')).toBe(true);
    expect(contentKeys.has('hero')).toBe(true);
    expect(contentKeys.has('hack')).toBe(false);
  });
});
