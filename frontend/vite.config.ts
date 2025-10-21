import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
  ],
  publicDir: 'public',
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/tier': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/tier-request': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/user': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/balance': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/crypt': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/bulk-user': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/level': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/network-reward': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/user-network-reward': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/withdrawal-request': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/migration': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/blockchain-analysis': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/topup-request': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/withdraw-request': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/conversion-rate': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/withdraw-request/create': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/registration-request': {
        target: 'https://localhost:3000',
        changeOrigin: true,
      }
    },
  },
})