import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Deliberately separate from vite.config.js: the app config pulls in
// vite-plugin-pwa, which generates a service worker and is pure overhead here.
// Tests only need the JSX transform.
//
// Default environment is node (the curriculum data tests need nothing else);
// files that touch the DOM opt in with a `@vitest-environment jsdom` docblock.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{js,jsx}'],
  },
})
