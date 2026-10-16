import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Vuga — Host Online Meetings Instantly',
        short_name: 'Vuga',
        description: 'Create a meeting link, video call, share your screen, and record instantly.',
        theme_color: '#0F4C81',
        background_color: '#F4F7FB',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,png,woff2}'],
        navigateFallback: '/index.html'
      }
    })
  ],
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 1600 }
});
