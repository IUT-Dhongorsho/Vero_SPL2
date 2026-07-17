import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      DATABASE_URL: 'postgres://user:pass@localhost:5432/test_db',
      BETTER_AUTH_SECRET: 'test_secret',
      NODE_ENV: 'test',
    },
  },
});
