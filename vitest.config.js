import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

/** Pure util tests only (no Vue DOM); keeps Vitest fast. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js']
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
