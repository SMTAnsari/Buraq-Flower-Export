import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

let pwaPlugin = null;
try {
  const { VitePWA } = await import('vite-plugin-pwa');
  pwaPlugin = VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico', 'favicon.svg', 'logo192.png'],
    manifest: {
      name: 'Buraq Flower Exports',
      short_name: 'Buraq Flowers',
      description: 'Premium flowers from Hosur — order fresh blooms online',
      theme_color: '#1A1A1A',
      background_color: '#FAF7F2',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: '/logo192.png', sizes: '192x192', type: 'image/png' },
        { src: '/logo512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
          handler: 'CacheFirst',
          options: { cacheName: 'cloudinary-images', expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 } },
        },
      ],
    },
  });
} catch {
  // vite-plugin-pwa not installed — skip PWA
}

export default defineConfig({
  plugins: [react(), ...(pwaPlugin ? [pwaPlugin] : [])],
  server: {
    port: 5174,
    strictPort: true,
  },
});
