import { env } from 'cloudflare:workers';
import * as defaults from '../data/site';

// site.ts remains the canonical shape (and seed source); D1 rows override it.
const shape = {
  meta: defaults.meta,
  hero: defaults.hero,
  about: defaults.about,
  services: defaults.services,
  photography: defaults.photography,
  video: defaults.video,
  marketing: defaults.marketing,
  influencer: defaults.influencer,
  reviews: defaults.reviews,
  contact: defaults.contact,
  socials: defaults.socials,
};
export type SiteContent = typeof shape;

export async function loadContent(): Promise<SiteContent> {
  const { results } = await env.DB.prepare('SELECT key, value FROM content').all<{ key: string; value: string }>();
  const merged: Record<string, unknown> = { ...shape };
  for (const { key, value } of results) {
    const base = merged[key];
    const row = JSON.parse(value);
    // one-level merge so fields added to site.ts defaults survive D1 rows that predate them
    merged[key] = base && typeof base === 'object' && !Array.isArray(base) && !Array.isArray(row) ? { ...base, ...row } : row;
  }
  return merged as SiteContent;
}

export interface MediaItem {
  url: string;
  w: number;
  h: number;
  categories: string[];
  id: number;
  label?: string;
}

export async function loadGallery(): Promise<MediaItem[]> {
  const { results } = await env.DB.prepare('SELECT id, r2_key, categories, w, h FROM gallery ORDER BY sort').all<{
    id: number;
    r2_key: string;
    categories: string;
    w: number;
    h: number;
  }>();
  return results.map((r) => ({ id: r.id, url: `/media/${r.r2_key}`, w: r.w, h: r.h, categories: JSON.parse(r.categories) }));
}

export async function loadBrands(): Promise<MediaItem[]> {
  const { results } = await env.DB.prepare('SELECT id, r2_key, w, h, label FROM brands WHERE enabled = 1 ORDER BY sort').all<{
    id: number;
    r2_key: string;
    w: number;
    h: number;
    label: string;
  }>();
  return results.map((r) => ({ id: r.id, url: `/media/${r.r2_key}`, w: r.w, h: r.h, categories: [], label: r.label }));
}
