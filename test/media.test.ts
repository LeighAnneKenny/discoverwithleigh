import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { PATCH, GET } from '../src/pages/api/admin/media';
import { applyMigrations } from './helpers';
import { loadBrands } from '../src/lib/content';

beforeAll(applyMigrations);

const patch = (table: string, body: unknown) => {
  const url = new URL(`https://x/api/admin/media?table=${table}`);
  const request = new Request(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (PATCH as any)({ url, request }) as Promise<Response>;
};

const get = (table: string) => {
  const url = new URL(`https://x/api/admin/media?table=${table}`);
  return (GET as any)({ url }) as Promise<Response>;
};

let brandA: number, brandB: number, shot: number;

beforeEach(async () => {
  await env.DB.prepare('DELETE FROM brands').run();
  await env.DB.prepare('DELETE FROM gallery').run();
  brandA = (await env.DB.prepare("INSERT INTO brands (r2_key, sort, w, h) VALUES ('brands/a.png', 0, 10, 10) RETURNING id").first<any>()).id;
  brandB = (await env.DB.prepare("INSERT INTO brands (r2_key, sort, w, h) VALUES ('brands/b.png', 1, 10, 10) RETURNING id").first<any>()).id;
  shot = (await env.DB.prepare("INSERT INTO gallery (r2_key, categories, sort, w, h) VALUES ('gallery/s.webp', '[]', 0, 10, 10) RETURNING id").first<any>()).id;
});

describe('admin media PATCH branching', () => {
  it('reorders by the order array', async () => {
    expect((await patch('brands', { order: [brandB, brandA] })).status).toBe(200);
    const rows = await (await get('brands')).json<any[]>();
    expect(rows.map((r) => r.id)).toEqual([brandB, brandA]);
  });

  it('updates gallery categories', async () => {
    expect((await patch('gallery', { id: shot, categories: ['weddings'] })).status).toBe(200);
    const rows = await (await get('gallery')).json<any[]>();
    expect(JSON.parse(rows[0].categories)).toEqual(['weddings']);
  });

  it('updates a brand label', async () => {
    expect((await patch('brands', { id: brandA, label: 'Acme' })).status).toBe(200);
    const rows = await (await get('brands')).json<any[]>();
    expect(rows.find((r) => r.id === brandA).label).toBe('Acme');
  });

  it('toggles brand visibility and loadBrands filters it', async () => {
    expect((await patch('brands', { id: brandA, enabled: false })).status).toBe(200);
    const rows = await (await get('brands')).json<any[]>();
    expect(rows.find((r) => r.id === brandA).enabled).toBe(0); // admin still sees it
    const publicBrands = await loadBrands(); // the site does not
    expect(publicBrands.map((b) => b.id)).toEqual([brandB]);
  });

  it('rejects mismatched or malformed bodies', async () => {
    expect((await patch('gallery', { id: shot, label: 'nope' })).status).toBe(400); // labels are brands-only
    expect((await patch('brands', { id: brandA, categories: ['nope'] })).status).toBe(400); // categories are gallery-only
    expect((await patch('brands', {})).status).toBe(400);
    expect((await patch('nonsense', { order: [1] })).status).toBe(400);
  });
});
