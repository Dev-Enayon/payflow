import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '');
  const apiBaseUrl = process.env.VITE_API_BASE_URL ?? fileEnv.VITE_API_BASE_URL;

  if (process.env.VERCEL === '1' && (!apiBaseUrl || !apiBaseUrl.startsWith('https://'))) {
    throw new Error(
      'VITE_API_BASE_URL must be set to the public HTTPS backend URL before deploying to Vercel.',
    );
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true,
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('recharts') || id.includes('/d3-')) return 'charts';
            if (id.includes('@radix-ui')) return 'radix';
          },
        },
      },
    },
  };
});
