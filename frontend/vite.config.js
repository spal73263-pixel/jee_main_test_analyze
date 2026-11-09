import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const localBackendTarget = process.env.BACKEND_URL || 'http://127.0.0.1:8000'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: process.env.VERCEL
      ? undefined
      : {
          '/api': {
            target: localBackendTarget,
            changeOrigin: true,
          },
          '/static': {
            target: localBackendTarget,
            changeOrigin: true,
          },
        },
  },
})
