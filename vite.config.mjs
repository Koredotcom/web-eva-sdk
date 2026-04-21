import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

const KEY_PATH = './certs/key.pem';
const CERT_PATH = './certs/cert.pem';
const hasCerts = fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH);

if (!hasCerts) {
  // eslint-disable-next-line no-console
  console.warn('[vite] certs/key.pem or certs/cert.pem missing — starting dev server over HTTP. Run mkcert (see README) to enable HTTPS at https://dev.kore.ai:5173.');
}

export default defineConfig({
  server: {
    host: '0.0.0.0',
    https: hasCerts
      ? {
          key: fs.readFileSync(KEY_PATH),
          cert: fs.readFileSync(CERT_PATH),
        }
      : false,
    open: hasCerts ? 'https://dev.kore.ai:5173' : 'http://localhost:5173',
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
