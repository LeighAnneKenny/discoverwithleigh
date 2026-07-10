import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const data = await request.formData();
  const field = (name: string) => String(data.get(name) ?? '').trim();

  // honeypot filled → bot; pretend success
  if (field('company')) return redirect('/?sent=1#contact', 303);

  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({
      // fail closed: a missing Worker secret must never mean unverified submissions
      secret: env.TURNSTILE_SECRET ?? '',
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
    // friction counter for the admin insights funnel (best-effort; bots that
    // filled the honeypot never reach here so they don't pollute it)
    await env.DB.prepare(
      "INSERT INTO metrics (day, metric, count) VALUES (date('now'), 'contact_error', 1) ON CONFLICT(day, metric) DO UPDATE SET count = count + 1",
    ).run().catch(() => {});
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
