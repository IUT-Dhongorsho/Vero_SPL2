import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    pool: 'forks',
    fileParallelism: false,
    // macOS writes `._*` AppleDouble files on non-APFS drives; never run them.
    exclude: ['**/node_modules/**', '**/._*'],
  },
});
