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
    // El formulario de paciente son ~35 preguntas y cada `fireEvent` vuelve a pintarlo entero:
    // en jsdom eso pasa de los 5 s por defecto. En el navegador no ocurre —se contesta una
    // pregunta cada vez—, así que el que va lento es el test, no la web.
    testTimeout: 20000,
  },
})
