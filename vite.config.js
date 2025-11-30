import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: "/WebRTC-Call-App/",
  build: {
    outDir: "docs"
  },
  plugins: [react()]
})