import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    electron([
      {
        entry: 'src/main.ts',
        vite: {
          build: {
            outDir: 'electron',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
      {
        entry: 'src/preload.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'electron',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
  ],
  resolve: {
    alias: [
      { find: '@repo/ui/src', replacement: path.resolve(__dirname, '../ui/src') },
      { find: '@repo/ui', replacement: path.resolve(__dirname, '../ui/src/index.ts') },
      { find: '@', replacement: path.resolve(__dirname, '../ui/src') },
    ],
    dedupe: ['yjs', 'y-protocols', 'y-websocket', '@tiptap/extension-collaboration', '@tiptap/extension-collaboration-cursor'],
  },
  server: {
    port: 5174,
  },
});
