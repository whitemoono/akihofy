import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react()
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: process.env.VITE_WS_BASE || 'ws://localhost:8000',
        ws: true,
      },
      '/tts': {
        target: process.env.VITE_TTS_BASE || 'http://localhost:8001',
        changeOrigin: true,
      },
      '/audio': {
        target: process.env.VITE_TTS_BASE || 'http://localhost:8001',
        changeOrigin: true,
      },
    }
  },
  optimizeDeps: {
    include: [
      'pixi.js',
      'untitled-pixi-live2d-engine'
    ]
  },
  assetsInclude: ['**/*.model3.json', '**/*.moc3', '**/*.physics3.json', '**/*.cdi3.json'],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
  }
})
