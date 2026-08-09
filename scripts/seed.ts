// One-shot seed: site content → D1, images → R2.
// Usage: node scripts/seed.ts [--remote]   (default: --local)
// Requires Node 22.6+ (TS type stripping) and wrangler auth for --remote.
import { execFileSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import * as site from '../src/data/site.ts';
import galleryItems from '../src/data/gallery.json' with { type: 'json' };

const remote = process.argv.includes('--remote');
const flag = remote ? '--remote' : '--local';
const wrangler = (args: string[]) =>
  execFileSync('npx', ['wrangler', ...args], { shell: true, stdio: ['ignore', 'inherit', 'inherit'] });

const esc = (s: string) => s.replace(/'/g, "''");
const stmts: string[] = [];

// --- content rows (delete-then-insert keeps reseeding idempotent) ---
const content: Record<string, unknown> = {
  meta: site.meta,
  hero: site.hero,
  about: site.about,
  services: site.services,
  photography: site.photography,
  video: site.video,
  marketing: site.marketing,
  visitors: site.visitors,
  reviews: site.reviews,
  contact: site.contact,
  socials: site.socials,
};
stmts.push('DELETE FROM content;', 'DELETE FROM gallery;', 'DELETE FROM brands;');
for (const [key, value] of Object.entries(content)) {
  stmts.push(`INSERT INTO content (key, value) VALUES ('${key}', '${esc(JSON.stringify(value))}');`);
}

// --- gallery ---
for (const [i, item] of galleryItems.entries()) {
  const meta = await sharp(`src/assets/gallery/${item.file}`).metadata();
  stmts.push(
    `INSERT INTO gallery (r2_key, categories, sort, w, h) VALUES ('gallery/${esc(item.file)}', '${esc(
      JSON.stringify(item.categories),
    )}', ${i}, ${meta.width}, ${meta.height});`,
  );
}

// --- brands ---
const brandFiles = readdirSync('src/assets/brands').sort();
for (const [i, file] of brandFiles.entries()) {
  const meta = await sharp(`src/assets/brands/${file}`).metadata();
  stmts.push(`INSERT INTO brands (r2_key, sort, w, h) VALUES ('brands/${esc(file)}', ${i}, ${meta.width}, ${meta.height});`);
}

writeFileSync('scripts/seed.sql', stmts.join('\n'));
console.log(`seed.sql: ${stmts.length} statements`);
wrangler(['d1', 'execute', 'discoverwithleigh', flag, '--file', 'scripts/seed.sql', '-y']);

// --- images to R2 ---
for (const item of galleryItems) {
  wrangler(['r2', 'object', 'put', `dwl-media/gallery/${item.file}`, '--file', `src/assets/gallery/${item.file}`, flag]);
}
for (const file of brandFiles) {
  wrangler(['r2', 'object', 'put', `dwl-media/brands/${file}`, '--file', `src/assets/brands/${file}`, flag]);
}
console.log('seed complete', flag);
