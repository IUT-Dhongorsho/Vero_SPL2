import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // whisper.service.test.ts belongs to meeting transcription (Meet), which is not built yet.
    exclude: ['**/node_modules/**', '**/._*', 'tests/unit/whisper.service.test.ts'],
  },
});
