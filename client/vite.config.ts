/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Los esquemas compartidos se compilan desde el código fuente para que un
      // cambio en shared/ se refleje sin reconstruir el paquete.
      // La entrada "pure" no importa Zod: el navegador se queda con los
      // límites y utilidades, y el validador se queda en el servidor.
      '@task-manager/shared/pure': fileURLToPath(
        new URL('../shared/src/pure.ts', import.meta.url),
      ),
      '@task-manager/shared': fileURLToPath(
        new URL('../shared/src/index.ts', import.meta.url),
      ),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Separar las librerías del código de la app: React y framer-motion no
        // cambian entre despliegues y pueden quedarse en la caché del navegador.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
