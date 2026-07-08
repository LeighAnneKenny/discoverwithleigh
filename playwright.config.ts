import { defineConfig, devices } from '@playwright/test';

// Galaxy S22–S25 all render at CSS 360×780 @3x — one profile covers the range.
const galaxy = {
  viewport: { width: 360, height: 780 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (Linux; Android 15; SM-S931B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
};

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  // the github reporter surfaces failures as public PR/commit annotations
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8788',
  },
  projects: [
    { name: 'desktop-1080p', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
    { name: 'desktop-1440p', use: { ...devices['Desktop Chrome'], viewport: { width: 2560, height: 1440 } } },
    { name: 'desktop-4k', use: { ...devices['Desktop Chrome'], viewport: { width: 3840, height: 2160 } } },
    // iPhone 12/13/14 share 390×844 @3x — the iPhone 12 descriptor covers all three (WebKit).
    { name: 'iphone-12-13-14', use: { ...devices['iPhone 12'] } },
    { name: 'iphone-15', use: { ...devices['iPhone 15'] } },
    { name: 'galaxy-s22-s25', use: { ...devices['Desktop Chrome'], ...galaxy } },
  ],
  webServer: {
    command: 'npm run build && npx wrangler dev --port 8788 --host localhost',
    url: 'http://127.0.0.1:8788',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
