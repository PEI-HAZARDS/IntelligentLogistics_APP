import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: '../', // shared .env lives in IntelligentLogistics_APP/
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  preview: {
    headers: {
      // Modern replacement for deprecated Feature-Policy.
      'Permissions-Policy': 'autoplay=(self), camera=(), microphone=(), geolocation=()',
    },
  },
  server: {
    headers: {
      // Modern replacement for deprecated Feature-Policy.
      'Permissions-Policy': 'autoplay=(self), camera=(), microphone=(), geolocation=()',
    },
    proxy: {
      '/api': {
        target: 'http://10.255.32.70:8000', // Update this IP to your API Gateway VM IP if different
        changeOrigin: true,
      },
      '/osrm': {
        target: 'https://router.project-osrm.org',
        changeOrigin: true,
        secure: false, // Bypass SSL validation if needed
        proxyTimeout: 10000, // 10 seconds for proxy to backend
        timeout: 10000, // 10 seconds upstream
        rewrite: (path) => path.replace(/^\/osrm/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
})
