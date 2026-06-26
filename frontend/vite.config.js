import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = String(env.VITE_API_BASE_URL || 'http://localhost:5000/api')
    .trim()
    .replace(/\/api\/?$/, '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: apiProxyTarget || 'http://localhost:5000',
          changeOrigin: true
        }
      }
    }
  };
});
