// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://discoverwithleigh.co.za',
  // ponytail: compile-time image optimisation — all pages are prerendered, so no
  // runtime Images binding needed; revisit when admin-uploaded R2 images arrive.
  adapter: cloudflare({ imageService: 'compile' })
});