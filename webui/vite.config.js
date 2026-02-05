import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/comfy': {
        target: 'http://127.0.0.1:8188',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/comfy/, ''),
        configure: (proxy) => {
          // ComfyUI allows requests with NO Origin header (like Krita's
          // native Python client) but rejects requests with a mismatched
          // Origin.  Strip it entirely so ComfyUI treats the proxy the
          // same way it treats Krita.
          proxy.on('proxyReq', (proxyReq, req) => {
            const origOrigin = req.headers['origin'] || '(none)'
            const origReferer = req.headers['referer'] || '(none)'
            console.log(`[proxy] ${req.method} ${req.url} → ${proxyReq.path}`)
            console.log(`[proxy]   Origin: ${origOrigin}  Referer: ${origReferer}`)
            console.log(`[proxy]   Headers being sent:`, Object.keys(proxyReq.getHeaders?.() || {}).join(', '))
            proxyReq.removeHeader('origin')
            proxyReq.removeHeader('referer')
            console.log(`[proxy]   After strip — Origin removed, Referer removed`)
          })
          proxy.on('proxyReqWs', (proxyReq, req, socket) => {
            const origOrigin = req.headers['origin'] || '(none)'
            console.log(`[proxy:ws] Upgrade ${req.url} → ${proxyReq.path}`)
            console.log(`[proxy:ws]   Origin: ${origOrigin}`)
            proxyReq.removeHeader('origin')
            console.log(`[proxy:ws]   After strip — Origin removed`)
          })
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log(`[proxy:res] ${proxyRes.statusCode} ← ${req.method} ${req.url}`)
            if (proxyRes.statusCode === 403) {
              console.log(`[proxy:res]   ⚠ 403 FORBIDDEN — ComfyUI rejected this request`)
              console.log(`[proxy:res]   Response headers:`, JSON.stringify(proxyRes.headers))
            }
          })
          proxy.on('error', (err, req) => {
            console.error(`[proxy:err] ${req.method} ${req.url} — ${err.message}`)
          })
        },
      },
    },
  },
})
