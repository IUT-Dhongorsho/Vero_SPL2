import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    allowedHosts: ['192.168.68.105.nip.io'],
    proxy: {
      '/api/auth': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
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
      },
      '/api/project': {
        target: 'http://localhost:8004',
        changeOrigin: true,
        secure: false,
      },
      '/api/chat': {
        target: 'http://localhost:8005',
        changeOrigin: true,
        secure: false,
      },
      '/api/notification': {
        target: 'http://localhost:8006',
        changeOrigin: true,
        secure: false,
      },
      '/api/meet': {
        target: 'http://localhost:8007',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
