import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the MetaMech Simulation Studio front‑end.
// This config enables React support and sets up a development proxy to
// forward API requests to the backend running on port 3000.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // proxy all API calls starting with /auth or /projects to the backend
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/projects': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});