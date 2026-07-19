/**
 * Content shape exhaustiveness check (PRD item 18).
 *
 * Enumerates every admin-visible leaf key in the content shape (the same shape
 * that drives the admin's generic form machinery) and asserts that each one
 * either renders to public HTML/attribute output or sits on the explicit
 * EXEMPTIONS list with a stated reason.
 *
 * This is the test that would have caught bug #7 (hero.title): if hero.title
 * were still in the shape it would appear in the enumerated paths, it would
 * not be in RENDERS, and it would not be in EXEMPTIONS, so the test would fail.
 * Demonstration: temporarily add 'hero.title' to site.ts hero — this test fails.
 * Leave it clean.
 */
import { describe, it, expect } from 'vitest';
import * as site from '../src/data/site';

// Recursively enumerate admin-visible leaf paths from the shape.
//   - string / boolean → the path itself (atomic leaf)
//   - array of primitives → the path itself (rendered as a unit)
//   - array of objects → each key from the first item becomes path[*].key
//   - plain object → recurse into each key
function leafPaths(obj: unknown, prefix = ''): string[] {
  if (typeof obj === 'string' || typeof obj === 'boolean') return [prefix];
  if (Array.isArray(obj)) {
    const first = obj[0];
    if (first !== null && first !== undefined && typeof first === 'object' && !Array.isArray(first)) {
      return Object.entries(first as Record<string, unknown>).flatMap(([k, v]) =>
        leafPaths(v, `${prefix}[*].${k}`),
      );
    }
    return [prefix]; // primitive array — the whole array is one editable unit
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
      leafPaths(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [prefix];
}

// Same section order as src/lib/content.ts `shape`.
const shape = {
  meta: site.meta,
  hero: site.hero,
  about: site.about,
  services: site.services,
  photography: site.photography,
  video: site.video,
  marketing: site.marketing,
  influencer: site.influencer,
  reviews: site.reviews,
  contact: site.contact,
  socials: site.socials,
  qa: site.qa,
};

// Every leaf path that appears in public HTML or attribute output.
// Attribute values count (href, data-*, aria-label, og: attrs, JSON-LD content).
// Update this set when wiring a new shape key to a component.
// ponytail: RENDERS is a trust list, not a proof — verify the wiring actually
// renders before adding an entry; upgrade path is sentinel-rendering every key
// through the round-trip spec if trust ever proves misplaced.
const RENDERS = new Set([
  // meta — title & description flow via Layout props; url appears in JSON-LD
  'meta.title',
  'meta.description',
  'meta.url',
  // hero — the h1 is a hardcoded brand lockup; only subtitle renders (bug #7)
  'hero.subtitle',
  // about
  'about.eyebrow',
  'about.heading',
  'about.body',
  'about.cta',
  // services list items
  'services',
  // photography
  'photography.eyebrow',
  'photography.heading',
  'photography.body',
  'photography.categories', // rendered as filter-tab labels + data-cats attrs
  'photography.cta.line',
  'photography.cta.label',
  // video — tiktokIds render as data-video-id attrs and TikTok embed hrefs
  'video.eyebrow',
  'video.heading',
  'video.body',
  'video.tiktokIds',
  'video.cta.line',
  'video.cta.label',
  // marketing
  'marketing.eyebrow',
  'marketing.heading',
  'marketing.body',
  'marketing.processTitle',
  'marketing.process[*].name',
  'marketing.process[*].text',
  'marketing.cta.line',
  'marketing.cta.label',
  // influencer
  'influencer.eyebrow',
  'influencer.heading',
  'influencer.body',
  'influencer.cta.line',
  'influencer.cta.label',
  // reviews
  'reviews[*].quote',
  'reviews[*].name',
  'reviews[*].org',
  // contact — phoneHref in href attr; whatsappMessage URL-encoded in wa.me href
  'contact.phone',
  'contact.phoneHref',
  'contact.email',
  'contact.studio',
  'contact.whatsappMessage',
  // socials — name in aria-label/title attrs; url in href attr
  'socials[*].name',
  'socials[*].url',
  // qa — questions and answers rendered in the Q&A chips widget
  'qa[*].question',
  'qa[*].answer',
]);

// Paths that are intentionally NOT rendered as text or attribute values.
// Must be boolean flags or other purely-behavioural fields.
// ponytail: exemption list is the contract — add a reason or it doesn't belong here
const EXEMPTIONS: Record<string, string> = {
  'socials[*].show': 'boolean flag — gates whether the link is included in the rendered list (not a value in output)',
  'qa[*].show': 'boolean flag — gates Q&A widget item visibility (not a value in output)',
  'qa[*].public': 'boolean flag — gates llms.txt / FAQ JSON-LD inclusion only; HTML output is driven by show, not public',
};

describe('content shape exhaustiveness', () => {
  const paths = leafPaths(shape);

  it('every editable leaf key either renders to public HTML or is on the exemption list', () => {
    const unaccounted = paths.filter((p) => !RENDERS.has(p) && !(p in EXEMPTIONS));
    expect(
      unaccounted,
      'paths not in RENDERS or EXEMPTIONS — wire them to a component or add a reason to EXEMPTIONS',
    ).toEqual([]);
  });

  it('RENDERS set contains no phantom paths (every entry matches a real shape leaf)', () => {
    const pathSet = new Set(paths);
    const phantoms = [...RENDERS].filter((p) => !pathSet.has(p));
    expect(
      phantoms,
      'RENDERS entries with no matching shape path — remove stale entries',
    ).toEqual([]);
  });
});
