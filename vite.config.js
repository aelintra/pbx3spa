import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    // Proxy /api to PBX3 instance so the browser doesn't hit ERR_CERT_AUTHORITY_INVALID (self-signed).
    // Set VITE_API_PROXY_TARGET in .env.development (e.g. https://192.168.1.205:44300).
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'https://192.168.1.205:44300',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
