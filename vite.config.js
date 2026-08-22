import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // woff2 is not in the workbox default globPatterns; without it the
        // self-hosted fonts would miss the precache and the trace guide would
        // fall back to a system font offline.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // The precache already answers every navigation offline. Serving it
        // cache-first is what makes a shipped fix invisible for a whole extra
        // load, so the shell is fetched network-first instead and only falls
        // back to the precached index.html — see the navigation rule below.
        navigateFallback: null,
        runtimeCaching: [
          {
            // Hashed build output. The filename changes when the bytes change,
            // so a hit is never stale and the network is never worth asking.
            // The precache route is registered first and already owns the js
            // and css; this covers everything under /assets/ that globPatterns
            // does not match — images today, recorded audio at PR 10.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'akshar-assets',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 365,
                purgeOnQuotaError: true
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // A safety net, not a dependency: PR 1 self-hosted every font and
            // nothing should reach Google again. If a stylesheet ever
            // regresses, this keeps the request from breaking the app offline.
            urlPattern: ({ url }) =>
              url.origin === 'https://fonts.googleapis.com' ||
              url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'akshar-google-fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
                purgeOnQuotaError: true
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Navigations: network first with a short leash, so a reload picks
            // up a new deploy immediately. handlerDidError is the offline path
            // — the precached index.html, matched with ignoreSearch because
            // workbox stores it under a ?__WB_REVISION__ key.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'akshar-shell',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 10 },
              cacheableResponse: { statuses: [0, 200] },
              plugins: [
                {
                  handlerDidError: async () =>
                    (await caches.match('/index.html', { ignoreSearch: true })) ||
                    Response.error()
                }
              ]
            }
          }
        ]
      },
      manifest: {
        name: 'Akshar Gujarati Learner',
        short_name: 'Gujarati Kid',
        description: 'PWA for Kids to Learn and Trace Gujarati Alphabets',
        theme_color: '#4f46e5',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})

