// Renders favicon assets. The aperture mark (public/favicon.svg) covers the
// small sizes (16/32/48 -> favicon.ico) where the full lockup is illegible.
// favicon.png (192) and apple-touch-icon.png (180) use the full brand lockup
// instead — src/assets/logo-lockup.png is white ink (designed for the site's
// always-dark header/footer, see CLAUDE.md), so it is composited onto the
// site's dark background for both sizes; on light it would be unreadable.
// Run manually when the mark, lockup, or brand teal changes:
//   node scripts/generate-favicons.mjs
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';

const svg = readFileSync('public/favicon.svg');
const LOCKUP = 'src/assets/logo-lockup.png';

// Site's dark theme background colour (src/styles/global.css :root --ink,
// the hex `body { background: var(--ink) }` paints in the dark theme).
const DARK_BG = '#0b0d0d';

async function renderAperture(size) {
  return sharp(svg).resize(size, size).png().toBuffer();
}

async function renderLockup(size, padPct) {
  const boxSize = Math.round(size * (1 - padPct * 2));
  const mark = await sharp(LOCKUP).resize(boxSize, boxSize, { fit: 'inside' }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: DARK_BG } })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer();
}

// ponytail: hand-rolled ICO packer instead of a new dependency — an ICO is
// just a 6-byte ICONDIR + 16-byte ICONDIRENTRY per image + the raw PNG blobs
// (PNG-compressed entries are valid in ICO since Vista).
function packIco(pngBuffers) {
  const count = pngBuffers.length;
  const dir = Buffer.alloc(6 + 16 * count);
  dir.writeUInt16LE(0, 0); // reserved
  dir.writeUInt16LE(1, 2); // type: icon
  dir.writeUInt16LE(count, 4);

  let offset = dir.length;
  const chunks = [dir];
  pngBuffers.forEach(({ size, buf }, i) => {
    const entry = 6 + 16 * i;
    dir.writeUInt8(size >= 256 ? 0 : size, entry + 0); // width (0 = 256)
    dir.writeUInt8(size >= 256 ? 0 : size, entry + 1); // height
    dir.writeUInt8(0, entry + 2); // color count
    dir.writeUInt8(0, entry + 3); // reserved
    dir.writeUInt16LE(1, entry + 4); // color planes
    dir.writeUInt16LE(32, entry + 6); // bits per pixel
    dir.writeUInt32LE(buf.length, entry + 8); // size in bytes
    dir.writeUInt32LE(offset, entry + 12); // offset
    chunks.push(buf);
    offset += buf.length;
  });
  return Buffer.concat(chunks);
}

async function verifyIco(icoBuf, sizes) {
  if (icoBuf.readUInt16LE(0) !== 0 || icoBuf.readUInt16LE(2) !== 1) throw new Error('bad ICONDIR magic');
  const count = icoBuf.readUInt16LE(4);
  if (count !== sizes.length) throw new Error(`expected ${sizes.length} entries, got ${count}`);
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  for (let i = 0; i < count; i++) {
    const entry = 6 + 16 * i;
    const len = icoBuf.readUInt32LE(entry + 8);
    const off = icoBuf.readUInt32LE(entry + 12);
    const blob = icoBuf.subarray(off, off + len);
    if (!blob.subarray(0, 8).equals(pngSig)) throw new Error(`entry ${i} at offset ${off} is not a PNG`);
    const meta = await sharp(blob).metadata();
    if (meta.width !== sizes[i] || meta.height !== sizes[i]) throw new Error(`entry ${i} decoded as ${meta.width}x${meta.height}, expected ${sizes[i]}`);
    console.log(`  ico entry ${i}: ${sizes[i]}x${sizes[i]}, ${len}B, offset ${off} — PNG sig ok, sharp round-trip ok`);
  }
  console.log('  ICONDIR: magic ok, count ok');
}

const icoSizes = [16, 32, 48];
const icoPngs = [];
for (const size of icoSizes) {
  const buf = await renderAperture(size);
  icoPngs.push({ size, buf });
}
const ico = packIco(icoPngs);
writeFileSync('public/favicon.ico', ico);
await verifyIco(ico, icoSizes);

const favicon192 = await renderLockup(192, 0.08);
writeFileSync('public/favicon.png', favicon192);

const apple180 = await renderLockup(180, 0.08);
writeFileSync('public/apple-touch-icon.png', apple180);

for (const [path, buf] of [
  ['public/favicon.ico', ico],
  ['public/favicon.png', favicon192],
  ['public/apple-touch-icon.png', apple180],
]) {
  console.log(`${path} — ${buf.length}B`);
}
