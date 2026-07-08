/// <reference types="@cloudflare/vitest-pool-workers" />

declare module '*.sql?raw' {
  const sql: string;
  export default sql;
}

declare module 'cloudflare:test' {
  interface ProvidedEnv {
    DB: D1Database;
    MEDIA: R2Bucket;
    ACCESS_TEAM_DOMAIN?: string;
    ACCESS_AUD?: string;
    ADMIN_DEV_BYPASS?: string;
    TURNSTILE_SECRET?: string;
  }
}
