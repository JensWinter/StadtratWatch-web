import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const sharedModelsFolder = fileURLToPath(new URL('../src/deps/astro/', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: /^@srw-astro\/models\/(.+)$/, replacement: `${sharedModelsFolder}$1.ts` }],
  },
})
