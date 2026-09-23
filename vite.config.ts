import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build:single` -> tek HTML dosyası (demo/paylaşım için).
// `npm run build`        -> normal, kod-bölünmüş üretim çıktısı.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  server: {
    host: true,
    proxy: {
      // AI analiz backend'i (server/index.mjs)
      '/api': 'http://localhost:8787',
    },
  },
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 2000,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
}));
