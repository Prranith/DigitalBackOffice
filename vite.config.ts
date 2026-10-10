import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import dotenv from 'dotenv';
import { handleAnalyzeRequest } from './server/apiRouter';
import { serverCache } from './server/cache';

dotenv.config();

function apiServerPlugin(): Plugin {
  return {
    name: 'api-server-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        if (req.url === '/api/health' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            status: 'ok',
            geminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
            cacheStats: serverCache.getStats(),
          }));
          return;
        }

        if (req.url === '/api/cache/stats' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(serverCache.getStats()));
          return;
        }

        if (req.url === '/api/cache/clear' && req.method === 'POST') {
          serverCache.clear();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ message: 'Cache cleared', stats: serverCache.getStats() }));
          return;
        }

        if (req.url?.startsWith('/api/analyze') && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const parsed = body ? JSON.parse(body) : {};
              const result = await handleAnalyzeRequest(parsed, req.headers as any);
              res.statusCode = result.status;
              Object.entries(result.headers).forEach(([k, v]) => res.setHeader(k, v));
              res.end(JSON.stringify(result.body));
            } catch (e: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e.message || 'Internal server error' }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
