import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Separado do vite.config.js para nao carregar o vue-devtools durante os testes
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
  },
})
