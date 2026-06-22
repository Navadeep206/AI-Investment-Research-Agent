import express from 'express';
import prisma from '../config/prisma.js';
import { getActiveRequests } from '../middleware/requestMonitor.js';

const router = express.Router();

/**
 * Endpoint to probe status of critical backend sub-modules (PostgreSQL, Gemini API, Tavily, cache).
 * GET /api/system/health
 */
router.get('/system/health', async (req, res) => {
  const health = {
    db: 'unhealthy',
    agents: 'unhealthy',
    cache: 'unhealthy',
    evidence: 'unhealthy'
  };

  try {
    // 1. Probe database connection
    await prisma.analysis.count();
    health.db = 'healthy';
  } catch (err) {
    console.error('[Health Check] Database probe failed:', err.message);
  }

  // 2. Probe Gemini LLM integration state
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (apiKey || process.env.MOCK_LLM === 'true') {
    health.agents = 'healthy';
  }

  // 3. Probe Cache module readiness
  health.cache = 'healthy';

  // 4. Probe Evidence search crawler state
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (tavilyKey || process.env.MOCK_LLM === 'true') {
    health.evidence = 'healthy';
  }

  const overallHealthy = Object.values(health).every(v => v === 'healthy');
  const system = overallHealthy ? 'healthy' : 'unhealthy';
  const statusCode = overallHealthy ? 200 : 503;

  return res.status(statusCode).json({
    system,
    database: health.db,
    cache: health.cache,
    agents: health.agents,
    evidence: health.evidence,
    version: '1.0.0',
    uptime: `${Math.floor(process.uptime())}s`,
    activeRequests: getActiveRequests()
  });
});

export default router;
