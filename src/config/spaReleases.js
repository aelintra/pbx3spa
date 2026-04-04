/**
 * Versions from package.json + Node at build time (see vite.config.js define).
 * @returns {{ pbx3spa: string, node: string, vue: string, vueRouter: string, pinia: string }}
 */
export function getSpaReleases() {
  const empty = { pbx3spa: '', node: '', vue: '', vueRouter: '', pinia: '' }
  try {
    const raw = import.meta.env.VITE_SPA_RELEASES_JSON
    if (raw == null || raw === '') {
      return empty
    }
    return JSON.parse(raw)
  } catch {
    return empty
  }
}
