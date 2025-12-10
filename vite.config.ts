import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        devOptions: { enabled: true, type: 'module' },
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'Veo Video Studio',
          short_name: 'Veo Studio',
          description: 'Video scene generation with Vertex AI',
          start_url: '/',
          display: 'standalone',
          background_color: '#000000',
          theme_color: '#000000',
          icons: [
            { src: '/favicon.svg', sizes: '192x192', type: 'image/svg+xml' },
            { src: '/favicon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }
          ]
        }
      })
    ],
    build: {
      modulePreload: {
        // Avoid modulepreload polyfill that can throw when DOM isn't available
        polyfill: false
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
