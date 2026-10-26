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
    {
      name: 'resolve-ui-from-desktop',
      resolveId(id, importer) {
        if (
          importer &&
          importer.includes('/apps/ui/src') &&
          !id.startsWith('.') &&
          !id.startsWith('/') &&
          !id.startsWith('\0') &&
          !id.startsWith('@repo/ui') &&
          !id.startsWith('@/')
        ) {
          return this.resolve(id, path.resolve(__dirname, 'src/renderer.tsx'), { skipSelf: true });
        }
        return null;
      },
    },
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
    dedupe: [
      'react',
      'react-dom',
      'react-router-dom',
      'yjs',
      'y-protocols',
      'y-websocket',
      '@tiptap/extension-collaboration',
      '@tiptap/extension-collaboration-cursor',
    ],
  },
  server: {
    port: 5174,
  },
});
