import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

// ponytail: falls back to the Turnstile always-pass test secret until the real
// widget exists — no worse than the old WP form, which delivered to /dev/null.
const TEST_SECRET = '1x0000000000000000000000000000000AA';

export const POST: APIRoute = async ({ request, redirect }) => {
  const data = await request.formData();
  const field = (name: string) => String(data.get(name) ?? '').trim();

  // honeypot filled → bot; pretend success
  if (field('company')) return redirect('/?sent=1#contact', 303);

  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET ?? TEST_SECRET,
      response: field('cf-turnstile-response'),
      remoteip: request.headers.get('CF-Connecting-IP') ?? '',
    }),
  });
  const outcome = (await verify.json()) as { success: boolean };

  const firstName = field('firstName');
  const lastName = field('lastName');
  const email = field('email');
  const message = field('message');
  if (!outcome.success || !firstName || !lastName || !email || !message) {
    return redirect('/?error=1#contact', 303);
  }

  await env.DB.prepare(
    'INSERT INTO enquiries (first_name, last_name, email, phone, message) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(firstName, lastName, email, field('phone'), message)
    .run();

  // Email is best-effort — the enquiry is already safe in D1.
  try {
    await env.EMAIL.send({
      to: env.ENQUIRY_EMAIL,
      from: { email: 'enquiries@discoverwithleigh.co.za', name: 'Discover With Leigh' },
      replyTo: email,
      subject: `New enquiry from ${firstName} ${lastName}`,
      text: [
        `Name: ${firstName} ${lastName}`,
        `Email: ${email}`,
        `Phone: ${field('phone') || '—'}`,
        '',
        message,
      ].join('\n'),
    });
  } catch (err) {
    console.error('enquiry email failed (stored in D1)', err);
  }

  return redirect('/?sent=1#contact', 303);
};
