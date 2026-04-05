/**
 * Versions from package.json + Node at build time (see vite.config.js define).
 * Vite may inject import.meta.env.VITE_SPA_RELEASES_JSON as an object or a JSON string;
 * JSON.parse only works on strings — parsing an object used to yield empty rows on Home.
 * @returns {{ pbx3spa: string, node: string, vue: string, vueRouter: string, pinia: string }}
 */
export function getSpaReleases() {
  const empty = { pbx3spa: '', node: '', vue: '', vueRouter: '', pinia: '' }
  try {
    const raw = import.meta.env.VITE_SPA_RELEASES_JSON
    if (raw == null || raw === '') {
      return empty
    }
    if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
      return {
        pbx3spa: String(raw.pbx3spa ?? ''),
        node: String(raw.node ?? ''),
        vue: String(raw.vue ?? ''),
        vueRouter: String(raw.vueRouter ?? ''),
        pinia: String(raw.pinia ?? '')
      }
    }
    if (typeof raw === 'string') {
      return { ...empty, ...JSON.parse(raw) }
    }
    return empty
  } catch {
    return empty
  }
}
