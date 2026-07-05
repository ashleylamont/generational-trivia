import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages friendly base; harmless locally.
export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
  },
})
