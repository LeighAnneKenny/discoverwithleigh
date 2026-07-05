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
};
export type SiteContent = typeof shape;

export async function loadContent(): Promise<SiteContent> {
  const { results } = await env.DB.prepare('SELECT key, value FROM content').all<{ key: string; value: string }>();
  const rows = Object.fromEntries(results.map((r) => [r.key, JSON.parse(r.value)]));
  return { ...shape, ...rows };
}

export interface MediaItem {
  url: string;
  w: number;
  h: number;
  categories: string[];
  id: number;
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
  const { results } = await env.DB.prepare('SELECT id, r2_key, w, h FROM brands ORDER BY sort').all<{
    id: number;
    r2_key: string;
    w: number;
    h: number;
  }>();
  return results.map((r) => ({ id: r.id, url: `/media/${r.r2_key}`, w: r.w, h: r.h, categories: [] }));
}
