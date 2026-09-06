import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Con code-splitting de rutas (React.lazy), Vite por defecto también divide el CSS
    // por chunk — eso genera un instante donde el JS ya se montó pero su CSS aún no
    // termina de cargar (se ve "roto" hasta refrescar, porque después queda cacheado).
    // Con un solo archivo CSS cargado desde el inicio, ese problema desaparece.
    cssCodeSplit: false,
  },
})