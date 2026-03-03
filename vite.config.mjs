import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    open: true,
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

