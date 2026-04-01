import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    https: {
      key: fs.readFileSync('./certs/key.pem'),
      cert: fs.readFileSync('./certs/cert.pem'),
    },
    open: 'https://dev.kore.ai:5173',
  },
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        // Use Dart Sass modern compiler API to avoid legacy warning
        api: 'modern-compiler',
      },
    },
  },
  build: {
    rollupOptions: {
      input: './index.html',
    },
  },
});
