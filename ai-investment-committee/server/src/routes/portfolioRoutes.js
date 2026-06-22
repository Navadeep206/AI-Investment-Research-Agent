import express from 'express';
import { analyzePortfolio } from '../controllers/portfolioController.js';

const router = express.Router();

/**
 * Route definition for analyzing a holdings portfolio.
 * POST /api/portfolio/analyze
 */
router.post('/portfolio/analyze', analyzePortfolio);

export default router;
