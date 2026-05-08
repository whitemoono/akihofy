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
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        secure: false,
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
