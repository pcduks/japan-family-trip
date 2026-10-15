import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, readFileSync } from 'node:fs'

const profile = JSON.parse(readFileSync(new URL('./content/profile.json', import.meta.url), 'utf8')) as { cv: { file: string } }
// The CV buttons only render when the PDF is actually in public/, so a fresh checkout never links to a 404.
const cvAvailable = existsSync(new URL(`./public/${profile.cv.file}`, import.meta.url))

// VITE_BASE lets the same build serve from a sub-path (GitHub Pages project site) or the root.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/',
  define: { __CV_AVAILABLE__: JSON.stringify(cvAvailable) },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (/node_modules\/(three|@react-three)\//.test(id)) return 'three'
          return undefined
        },
      },
    },
  },
})
