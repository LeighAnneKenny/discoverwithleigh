import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// Defense in depth behind Cloudflare Access: every /admin* and /api/admin*
// request must carry a valid Access JWT, regardless of hostname. Fail closed —
// missing config or token means 403, including all workers.dev traffic.
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

export const onRequest = defineMiddleware(async (context, next) => {
  // Legacy WordPress URLs (PRD item 12): 301 the real pages to their new
  // homes; the rest of the export debris (wp-content, feeds, wp-json…) falls
  // through to the branded 404.
  const { pathname, searchParams } = context.url;
  if (pathname === '/privacy-policy.html') return context.redirect('/privacy-policy', 301);
  if (pathname === '/index.html' || pathname === '/home' || pathname === '/home/' || (pathname === '/' && searchParams.has('p'))) {
    return context.redirect('/', 301);
  }

  if (!/^\/(admin|api\/admin)(\/|$)/.test(context.url.pathname)) return next();

  // Local development only: bypass requires the gitignored .dev.vars flag AND a
  // loopback host — deployed traffic can never present a localhost Host header.
  const host = context.url.hostname;
  if (env.ADMIN_DEV_BYPASS === 'allow-local-dev' && (host === '127.0.0.1' || host === 'localhost')) {
    return next();
  }

  const token = context.request.headers.get('Cf-Access-Jwt-Assertion');
  const team = env.ACCESS_TEAM_DOMAIN;
  if (!token || !team || !env.ACCESS_AUD) {
    console.error('admin denied:', { hasToken: !!token, hasTeam: !!team, hasAud: !!env.ACCESS_AUD });
    return new Response('Forbidden', { status: 403 });
  }

  try {
    jwks ??= createRemoteJWKSet(new URL(`${team}/cdn-cgi/access/certs`));
    await jwtVerify(token, jwks, { issuer: team, audience: env.ACCESS_AUD });
  } catch (err) {
    console.error('admin JWT rejected:', err instanceof Error ? `${err.name}: ${err.message}` : String(err));
    return new Response('Forbidden', { status: 403 });
  }
  return next();
});
