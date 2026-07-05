import type { APIRoute } from 'astro';

export const prerender = false;

// ponytail: phase-3 upgrade adds Turnstile verification, D1 storage, and Resend email.
export const POST: APIRoute = async ({ request, redirect }) => {
  const data = await request.formData();
  // honeypot filled → bot; pretend success
  if (!data.get('company')) {
    console.log('enquiry received', Object.fromEntries(data.entries()));
  }
  return redirect('/?sent=1#contact', 303);
};
