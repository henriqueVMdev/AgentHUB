import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5290,
    strictPort: true, // porta dedicada — falha em vez de migrar silenciosamente se ocupada
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
