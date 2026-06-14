import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // URL du backend :
  //   - En dev  : variable VITE_API_URL ou localhost:5000
  //   - En prod : même domaine (pas de proxy nécessaire si même serveur)
  const apiTarget = env.VITE_API_URL || 'http://localhost:5000';

  return {
    plugins: [react()],

    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },

    // Dev server
    server: {
      port: 3000,
      host: true,           // accessible sur le réseau local (mobile)
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          // /api/xxx → /api/v1/xxx
          rewrite: p => p.replace(/^\/api/, '/api/v1'),
        },
      },
    },

    // Build prod
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor:   ['react', 'react-dom', 'react-router-dom'],
            charts:   ['recharts'],
            ui:       ['framer-motion', 'lucide-react'],
            date:     ['date-fns'],
          },
        },
      },
    },

    // Preview prod local
    preview: {
      port: 4173,
      host: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: p => p.replace(/^\/api/, '/api/v1'),
        },
      },
    },
  };
});
