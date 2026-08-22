import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base "/" porque se sirve en un dominio propio (valida.edpain.com), no en /repo/.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: { outDir: 'dist', sourcemap: false },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/**/*.test.{js,jsx}'],
  },
})
