import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      // Node 25+ ships its own localStorage global, which is empty without --localstorage-file
      // and hides jsdom's. Turn it off so the tests run the same on Node 22, 24 and 26.
      execArgv: ['--no-experimental-webstorage'],
      exclude: [...configDefaults.exclude, 'e2e/**'],
      setupFiles: ['src/__tests__/setup.ts'],
      include: ['src/**/*.spec.ts'],
      coverage: {
        include: ['src/**/*.{ts,vue}'],
        exclude: ['src/**/__tests__/**', 'src/**/__fixtures__/**', 'src/main.ts'],
      },
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
