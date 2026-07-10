// Pre-optimizes the fixed brand images into static webp variants under
// public/img/. Run manually when a source asset changes:
//   node scripts/optimize-images.mjs
//
// Why: the site's pages are server-rendered (on-demand, D1-driven), and
// @astrojs/cloudflare's compile-time image optimization only covers
// prerendered routes — the runtime /_image endpoint in workerd is a no-op
// passthrough, so <Image> was shipping the full-size originals to everyone.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

mkdirSync('public/img', { recursive: true });

const jobs = [
  { src: 'src/assets/hero-bg.jpg', name: 'hero-bg', widths: [480, 820, 1400, 2200], quality: 65 },
  { src: 'src/assets/about-leigh.jpg', name: 'about-leigh', widths: [480, 760, 980], quality: 65 },
  { src: 'src/assets/logo-lockup.png', name: 'logo-lockup', widths: [240, 480, 720], quality: 82 },
];

for (const { src, name, widths, quality } of jobs) {
  const meta = await sharp(src).metadata();
  for (const w of widths) {
    const out = `public/img/${name}-${w}.webp`;
    const { size, height } = await sharp(src).resize(w).webp({ quality }).toFile(out);
    console.log(`${out} ${w}x${height} ${(size / 1024).toFixed(0)}KB`);
  }
  console.log(`  (source ${meta.width}x${meta.height})`);
}
