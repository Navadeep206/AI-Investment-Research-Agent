import express from 'express';
import { analyzeCompany } from '../controllers/analysisController.js';

const router = express.Router();

// Route to execute the full LangGraph investment workflow
router.post('/analyze', analyzeCompany);

export default router;
