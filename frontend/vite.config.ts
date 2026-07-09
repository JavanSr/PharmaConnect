import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '0.0.0.0', '::1']);

function isLoopbackUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return LOOPBACK_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function isPlaceholderUrl(value: string): boolean {
  return value.includes('YOUR_BACKEND_HOST');
}

function isAbsoluteHttpsApiUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.pathname.replace(/\/$/, '').endsWith('/api/v1');
  } catch {
    return false;
  }
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const apiUrl = env.VITE_API_URL?.trim();

  if (mode === 'production') {
    if (!apiUrl) {
      throw new Error(
        'Refusing to build production frontend without VITE_API_URL. Set it to the deployed backend URL ending in /api/v1.',
      );
    }

    if (isLoopbackUrl(apiUrl) || isPlaceholderUrl(apiUrl) || !isAbsoluteHttpsApiUrl(apiUrl)) {
      throw new Error(
        'Refusing to build production frontend with invalid VITE_API_URL. Set VITE_API_URL to the HTTPS deployed backend URL ending in /api/v1.',
      );
    }
  }

  return {
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        injectRegister: null,
        manifest: false,
        injectManifest: {
          // injectionPoint defaults to 'self.__WB_MANIFEST' — matches sw.js
          // Do NOT set injectionPoint: undefined here; that would disable
          // precache manifest injection and break offline chunk loading.
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          // Vite 8 (rolldown) only supports the function form of manualChunks
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            if (/[\\/]node_modules[\\/](react|react-dom|react-router-dom|scheduler)[\\/]/.test(id)) return 'vendor';
            if (id.includes('@tanstack/react-query')) return 'query';
            if (/[\\/]node_modules[\\/](lucide-react|framer-motion)[\\/]/.test(id)) return 'ui';
            return undefined;
          },
        },
      },
    },
  };
});
