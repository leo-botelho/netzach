import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Atualiza o app automaticamente quando você sobe melhorias
      includeAssets: ['favicon.ico', 'logo.svg'], // Arquivos estáticos importantes
      manifest: {
        name: 'LEO System',
        short_name: 'LEO',
        description: 'Listen. Engage. Organize. O novo padrão em agendamento.',
        theme_color: '#FDFBF7', // Cor de fundo do LEO
        background_color: '#FDFBF7',
        display: 'standalone', // Abre sem a barra do navegador (jeito de app)
        orientation: 'portrait', // Bloqueia rotação se quiser, ou remova para livre
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Importante para Android
          }
        ]
      }
    })
  ],
});