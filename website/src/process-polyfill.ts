// Browser polyfill for process.env — needed when Next.js packages are bundled for browser use
if (typeof globalThis.process === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).process = {
    env: {
      NODE_ENV: 'production',
      NEXT_PUBLIC_SITE_URL: 'https://apotekh.co.tz',
    },
    browser: true,
  };
}
