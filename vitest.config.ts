import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts on purpose: keeps the dev-server analytics
// plugin (Mongo/env loading) out of the test run.
export default defineConfig({
  test: {
    include: ['src/v2/**/*.test.ts'],
    environment: 'node',
  },
})
