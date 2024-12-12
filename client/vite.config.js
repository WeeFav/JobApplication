import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000/', // Your backend server URL
        changeOrigin: true, // Needed for virtual hosted sites
        rewrite: (path) => path.replace(/^\/api/, ''), // Rewrite '/api' to ''
      },
    },
  },
});
