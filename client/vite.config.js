import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In development, /api calls go to the Express server so we avoid CORS issues
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
