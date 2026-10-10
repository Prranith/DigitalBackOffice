import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { handleAnalyzeRequest } from './server/apiRouter.js';
import { serverCache } from './server/cache.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));

// Health & telemetry endpoint
app.get('/api/health', (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    geminiConfigured: !!(
      geminiKey &&
      geminiKey !== 'MY_GEMINI_API_KEY' &&
      geminiKey !== 'MY_GOOGLE_API_KEY'
    ),
    cacheStats: serverCache.getStats(),
  });
});

// Cache stats endpoint
app.get('/api/cache/stats', (req, res) => {
  res.json(serverCache.getStats());
});

// Clear cache endpoint
app.post('/api/cache/clear', (req, res) => {
  serverCache.clear();
  res.json({ message: 'Cache successfully cleared', stats: serverCache.getStats() });
});

// Main AI analysis endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const result = await handleAnalyzeRequest(req.body, req.headers);
    Object.entries(result.headers).forEach(([k, v]) => res.setHeader(k, v));
    res.status(result.status).json(result.body);
  } catch (err: any) {
    console.error('API /api/analyze error:', err);
    res.status(500).json({ error: err.message || 'Internal server error during analysis' });
  }
});

// Serve frontend static assets in production
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`InsightPulse AI Server running on http://localhost:${PORT}`);
});
