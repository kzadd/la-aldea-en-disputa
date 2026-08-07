import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'La Aldea en Disputa',
        short_name: 'La Aldea',
        description: 'Juego multijugador de recursos, construcción y sabotaje para 2-8 jugadores',
        lang: 'es',
        theme_color: '#1a1410',
        background_color: '#1a1410',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['games'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // El estado de juego vive en Supabase y cambia cada pocos segundos:
        // se cachea el caparazón de la app, nunca las respuestas de la API.
        globPatterns: ['**/*.{js,css,html,woff2,png}'],
        navigateFallbackDenylist: [/^\/rest/, /^\/auth/, /^\/realtime/],
      },
    }),
  ],
})
