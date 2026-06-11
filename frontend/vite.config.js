import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During development the API runs on :5000. Proxy /api and /health so the
// frontend can call them with same-origin relative URLs.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000',
      '/health': 'http://localhost:5000',
    },
  },
});
