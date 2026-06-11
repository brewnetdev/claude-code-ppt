import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Process CSS so `*.css?raw` imports resolve to their real content under
    // the node test env (default `false` returns ''). The exporter bundles
    // theme CSS via ?raw, and its regression test asserts that content.
    css: true,
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    testTimeout: 30000,
  },
});
