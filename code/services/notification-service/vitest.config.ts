import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 15000,
    pool: 'forks',
    fileParallelism: false,
    // macOS writes `._*` AppleDouble files on non-APFS drives; never run them.
    exclude: ['**/node_modules/**', '**/._*'],
    // Tests must never reach a real mailbox or browser. Defined-but-empty values
    // win over .env (dotenv does not override), leaving SMTP and push off.
    env: { SMTP_HOST: '', VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '' },
  },
});
