import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup-env.ts'],
    // Arrancar Mongo en memoria y sembrar datos tarda más que un test unitario.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Los tests comparten una única base en memoria: en paralelo se pisarían
    // los borrados de `beforeEach`.
    fileParallelism: false,
  },
})
