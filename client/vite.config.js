// client/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // écoute sur 0.0.0.0 -> accessible depuis le téléphone
    port: 5173,
    strictPort: true,
  },
})
