import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Keep the browser proxy on the backend's IPv4 listener. On systems
      // where localhost resolves to IPv6 first, this avoids intermittent 502s.
      '/api': 'http://127.0.0.1:5000',
    },
  },
})
