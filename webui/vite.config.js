import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      '/comfy': {
        target: 'http://10.0.0.3:8188',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/comfy/, ''),
      },
    },
  },
})
