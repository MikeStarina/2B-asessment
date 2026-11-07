import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

const root = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  resolve: {
    alias: {
      '@/app': path.resolve(root, 'src/app'),
      '@/pages': path.resolve(root, 'src/pages'),
      '@/entities': path.resolve(root, 'src/entities'),
      '@/shared': path.resolve(root, 'src/shared'),
    },
  },
})
