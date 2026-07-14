import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

const pkgPath = fileURLToPath(new URL('./package.json', import.meta.url))
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
/** Injected into import.meta.env — must be a plain object (not pre-JSON.stringify’d). */
const spaReleasesEmbedded = {
  pbx3spa: pkg.version,
  /** Node used to run Vite / produce this bundle (not a browser runtime). */
  node: process.version,
  vue: pkg.dependencies.vue ?? '',
  vueRouter: pkg.dependencies['vue-router'] ?? '',
  pinia: pkg.dependencies.pinia ?? ''
}

export default defineConfig(({ mode }) => {
  // Load env so VITE_API_PROXY_TARGET is available when config runs (Vite doesn't load .env before config by default)
  const env = loadEnv(mode, process.cwd(), '')
  // Proxy target is only used when the user enters the dev server as API base at login (e.g. http://localhost:5173/api).
  // The user normally sets their API server URL at login; set VITE_API_PROXY_TARGET in .env.development for that dev-only case.
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000'
  /** When set, `/dev-catalog/*` proxies to this S3 bucket origin (avoids browser CORS in local dev). */
  const catalogProxyTarget = (env.VITE_CATALOG_PROXY_TARGET ?? '').replace(/\/$/, '')
  const gatekeeperProxyTarget = (env.VITE_FLEET_GATEKEEPER_PROXY_TARGET ?? '').replace(/\/$/, '')

  const proxy = {
    '/api': {
      target: proxyTarget,
      changeOrigin: true,
      secure: false
    }
  }
  if (catalogProxyTarget) {
    proxy['/dev-catalog'] = {
      target: catalogProxyTarget,
      changeOrigin: true,
      secure: true,
      rewrite: (path) => path.replace(/^\/dev-catalog/, '')
    }
  }
  if (gatekeeperProxyTarget) {
    proxy['/fleet-gk'] = {
      target: gatekeeperProxyTarget,
      changeOrigin: true,
      secure: true,
      rewrite: (path) => path.replace(/^\/fleet-gk/, '')
    }
  }

  return {
    define: {
      'import.meta.env.VITE_SPA_RELEASES_JSON': spaReleasesEmbedded
    },
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      // Proxy /api when the app is pointed at the dev server as API base (see comment above).
      proxy
    }
  }
})
