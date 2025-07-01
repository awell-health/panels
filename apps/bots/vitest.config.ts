import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    fileParallelism: false,
    setupFiles: 'dotenv/config',
    include: ['**/*.test.ts', '**/*.spec.ts'],
    typecheck: {
      tsconfig: './tsconfig.json',
    },
    server: {
      sourcemap: 'inline',
    },
  },
}) 