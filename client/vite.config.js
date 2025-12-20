import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "tailwindcss";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    watch: {
        usePolling: true,
        interval: 300, // check every 300ms
    },
    port: 5000,
    proxy: {
      '/server_api': {
        target: 'http://server:8000/', // Your backend server URL
        changeOrigin: true, // Needed for virtual hosted sites
        rewrite: (path) => path.replace(/^\/server_api/, ''), // Rewrite '/api' to ''
      },
      '/python_api': {
        target: 'http://python:8080/', // Your backend server URL
        changeOrigin: true, // Needed for virtual hosted sites
        rewrite: (path) => path.replace(/^\/python_api/, ''), // Rewrite '/api' to ''
      },
      '/ws_api': {
        target: 'ws://python:8080/', // Your backend server URL
        changeOrigin: true, // Needed for virtual hosted sites
        rewrite: (path) => path.replace(/^\/ws_api/, ''), // Rewrite '/api' to ''
      },
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
});
