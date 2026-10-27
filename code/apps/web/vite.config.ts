import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'resolve-ui-from-web',
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
          return this.resolve(id, path.resolve(__dirname, 'src/main.tsx'), { skipSelf: true });
        }
        return null;
      },
    },
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
      // One copy of the editor core: two copies of prosemirror crash the
      // editor on mount ("Schema is missing its top node type").
      '@tiptap/core',
      '@tiptap/pm',
      'y-prosemirror',
      'prosemirror-model',
      'prosemirror-state',
      'prosemirror-view',
      'prosemirror-transform',
    ],
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
    // Mirrors infra/nginx/nginx.conf: services that mount their routes at the
    // root need the `/api` prefix stripped; board and notes mount `/api/...`
    // themselves and are passed through untouched.
    proxy: {
      // Better Auth handles both `/api/better-auth/*` and `/better-auth/*`
      '/api/better-auth': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/api/auth': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/user': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/users': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/mail': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/internal': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/board': {
        target: 'http://localhost:8002',
        changeOrigin: true,
        secure: false,
      },
      '/api/notes': {
        target: 'http://localhost:8003',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/api/project': {
        target: 'http://localhost:8004',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/chat': {
        target: 'http://localhost:8005',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/api\/chat/, ''),
      },
      '/api/notifications': {
        target: 'http://localhost:8006',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/notification': {
        target: 'http://localhost:8006',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/api\/notification/, '/notifications'),
      },
      '/notification/notifications': {
        target: 'http://localhost:8006',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/notification/, ''),
      },
      '/api/meet': {
        target: 'http://localhost:8007',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/api\/meet/, ''),
      },
    },
  },
});
