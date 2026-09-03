import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Hub-ul stă la rădăcina site-ului (nu într-un subfolder, ca HR),
// deci base rămâne implicit '/'.
export default defineConfig({
  plugins: [react()],
})
