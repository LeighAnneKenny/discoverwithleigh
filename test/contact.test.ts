import { env } from 'cloudflare:test';
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { POST } from '../src/pages/api/contact';
import { applyMigrations, redirect } from './helpers';

beforeAll(applyMigrations);

// The handler's only outbound call is Turnstile siteverify — stub fetch itself.
let siteverify: ReturnType<typeof vi.fn>;
const mockTurnstile = (success: boolean) => {
  siteverify = vi.fn(async () => Response.json({ success }));
  vi.stubGlobal('fetch', siteverify);
};
afterEach(() => vi.unstubAllGlobals());

const submit = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.append(k, v);
  const request = new Request('https://preview.discoverwithleigh.co.za/api/contact', {
    method: 'POST',
    body: data,
  });
  return (POST as any)({ request, redirect }) as Promise<Response>;
};

const valid = {
  firstName: 'Test',
  lastName: 'Person',
  email: 'test@example.com',
  phone: '0123456789',
  message: 'Hello there',
  'cf-turnstile-response': 'token',
};

const enquiryCount = async () =>
  (await env.DB.prepare('SELECT COUNT(*) AS n FROM enquiries').first<{ n: number }>())!.n;

beforeEach(() => env.DB.prepare('DELETE FROM enquiries').run());

describe('POST /api/contact', () => {
  it('honeypot pretends success and stores nothing (no Turnstile call)', async () => {
    mockTurnstile(true);
    const res = await submit({ ...valid, company: 'spam co' });
    expect(res.headers.get('Location')).toBe('/?sent=1#contact');
    expect(siteverify).not.toHaveBeenCalled();
    expect(await enquiryCount()).toBe(0);
  });

  it('rejects when Turnstile fails, storing nothing', async () => {
    mockTurnstile(false);
    const res = await submit(valid);
    expect(res.headers.get('Location')).toBe('/?error=1#contact');
    expect(await enquiryCount()).toBe(0);
  });

  it('rejects when required fields are missing, even with Turnstile passing', async () => {
    mockTurnstile(true);
    for (const missing of ['firstName', 'lastName', 'email', 'message']) {
      const { [missing]: _, ...rest } = valid as Record<string, string>;
      const res = await submit(rest);
      expect(res.headers.get('Location')).toBe('/?error=1#contact');
    }
    expect(await enquiryCount()).toBe(0);
  });

  it('stores a valid enquiry even though email sending fails (no EMAIL binding here)', async () => {
    mockTurnstile(true);
    const res = await submit(valid);
    expect(res.headers.get('Location')).toBe('/?sent=1#contact');
    const row = await env.DB.prepare('SELECT * FROM enquiries').first<any>();
    expect(row).toMatchObject({
      first_name: 'Test',
      last_name: 'Person',
      email: 'test@example.com',
      phone: '0123456789',
      message: 'Hello there',
    });
  });

  it('rejects whitespace-only required fields', async () => {
    mockTurnstile(true);
    const res = await submit({ ...valid, message: '   ' });
    expect(res.headers.get('Location')).toBe('/?error=1#contact');
    expect(await enquiryCount()).toBe(0);
  });
});
