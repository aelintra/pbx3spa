import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

const pkgPath = fileURLToPath(new URL('./package.json', import.meta.url))
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
const spaReleasesJson = JSON.stringify({
  pbx3spa: pkg.version,
  vue: pkg.dependencies.vue ?? '',
  vueRouter: pkg.dependencies['vue-router'] ?? '',
  pinia: pkg.dependencies.pinia ?? ''
})

export default defineConfig(({ mode }) => {
  // Load env so VITE_API_PROXY_TARGET is available when config runs (Vite doesn't load .env before config by default)
  const env = loadEnv(mode, process.cwd(), '')
  // Proxy target is only used when the user enters the dev server as API base at login (e.g. http://localhost:5173/api).
  // The user normally sets their API server URL at login; set VITE_API_PROXY_TARGET in .env.development for that dev-only case.
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000'

  return {
    define: {
      'import.meta.env.VITE_SPA_RELEASES_JSON': JSON.stringify(spaReleasesJson)
    },
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      // Proxy /api when the app is pointed at the dev server as API base (see comment above).
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false
        }
      }
    }
  }
})
