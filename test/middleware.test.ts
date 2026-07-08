import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { onRequest } from '../src/middleware';

const saved = {
  team: env.ACCESS_TEAM_DOMAIN,
  aud: env.ACCESS_AUD,
};

const call = (path: string, opts: { host?: string; token?: string } = {}) => {
  const url = new URL(`https://${opts.host ?? 'preview.discoverwithleigh.co.za'}${path}`);
  const headers = new Headers();
  if (opts.token) headers.set('Cf-Access-Jwt-Assertion', opts.token);
  const context = { url, request: new Request(url, { headers }) } as any;
  const next = () => Promise.resolve(new Response('passed'));
  return (onRequest as any)(context, next) as Promise<Response>;
};

beforeEach(() => {
  // each test starts from production-like config: no bypass flag
  delete env.ADMIN_DEV_BYPASS;
  env.ACCESS_TEAM_DOMAIN = saved.team;
  env.ACCESS_AUD = saved.aud;
});
afterAll(() => {
  delete env.ADMIN_DEV_BYPASS;
  env.ACCESS_TEAM_DOMAIN = saved.team;
  env.ACCESS_AUD = saved.aud;
});

describe('admin auth middleware', () => {
  it('lets non-admin paths straight through', async () => {
    for (const path of ['/', '/privacy-policy', '/api/contact', '/administrator']) {
      const res = await call(path);
      expect(await res.text()).toBe('passed');
    }
  });

  it('denies admin paths without a token', async () => {
    for (const path of ['/admin', '/admin/', '/api/admin/content', '/api/admin/media']) {
      expect((await call(path)).status).toBe(403);
    }
  });

  it('fails closed when Access config is missing', async () => {
    delete env.ACCESS_AUD;
    expect((await call('/admin', { token: 'anything' })).status).toBe(403);
  });

  it('rejects a garbage token', async () => {
    expect((await call('/admin', { token: 'not-a-jwt' })).status).toBe(403);
  });

  it('bypass requires the flag AND a loopback host', async () => {
    // no flag, loopback host → denied
    expect((await call('/admin', { host: 'localhost' })).status).toBe(403);

    env.ADMIN_DEV_BYPASS = 'allow-local-dev';
    // flag, production host → denied
    expect((await call('/admin')).status).toBe(403);
    // flag, wrong value would deny too
    env.ADMIN_DEV_BYPASS = 'allow';
    expect((await call('/admin', { host: 'localhost' })).status).toBe(403);
    // flag + loopback → passes
    env.ADMIN_DEV_BYPASS = 'allow-local-dev';
    expect(await (await call('/admin', { host: 'localhost' })).text()).toBe('passed');
    expect(await (await call('/api/admin/content', { host: '127.0.0.1' })).text()).toBe('passed');
  });
});
