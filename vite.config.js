import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // The upstream API at dira.moch.gov.il returns
      // `Access-Control-Allow-Origin: *` twice (origin + CloudFront), which
      // browsers reject. We proxy through Vite so the browser sees a
      // same-origin response and skips CORS validation entirely.
      '/dira-api': {
        target: 'https://dira.moch.gov.il',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/dira-api/, '/api'),
      },
    },
  },
});
