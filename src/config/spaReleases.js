/**
 * Versions from package.json at build time (see vite.config.js define).
 * @returns {{ pbx3spa: string, vue: string, vueRouter: string, pinia: string }}
 */
export function getSpaReleases() {
  try {
    const raw = import.meta.env.VITE_SPA_RELEASES_JSON
    if (raw == null || raw === '') {
      return { pbx3spa: '', vue: '', vueRouter: '', pinia: '' }
    }
    return JSON.parse(raw)
  } catch {
    return { pbx3spa: '', vue: '', vueRouter: '', pinia: '' }
  }
}
