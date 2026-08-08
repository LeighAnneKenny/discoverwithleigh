import type { APIRoute } from 'astro';
import { loadContent } from '../lib/content';

// Dynamic llms.txt (PRD item 13): the static base plus the public Q&A items
// from D1 — the same rows the on-site widget renders, so external LLMs quote
// the same facts. public:false items (rates) must never appear here.
export const prerender = false;

export const GET: APIRoute = async () => {
  const { qa } = await loadContent();
  const publicQa = qa.filter((i) => i.show && i.public);

  const text = `# Discover With Leigh

> Professional photographer and digital marketing specialist based in Century City, Cape Town, South Africa. Leigh-Anne Kenny creates photography, marketing video content, social media management, and influencer campaigns for brands, agencies, couples, and small businesses.

Also shoots for travellers and tourists visiting Cape Town — Airbnb stays, photographer-for-a-day sessions, and special occasions — alongside weddings and brand content.

## Services

- Professional photography: product, lifestyle, music, portrait, wedding, and property photography
- Marketing video creation: video, stills, and copywriting for brands and agencies (established 2013)
- Social media management: strategy, content creation, posting and community management, performance analysis
- Influencer campaigns: unboxings, product reviews, and customer experience content
${
  publicQa.length
    ? `
## Quick answers

${publicQa.map((i) => `- **${i.question}** ${i.answer}`).join('\n')}
`
    : ''
}
## Contact

- Website: https://discoverwithleigh.co.za/ (contact details, form and WhatsApp on the home page)
- Location: Century City, Cape Town, South Africa
- Instagram/TikTok: @discover_with_leigh

## Pages

- [Home](https://discoverwithleigh.co.za/): portfolio, services, client reviews, contact form
- [Privacy Policy](https://discoverwithleigh.co.za/privacy-policy/)
`;

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
