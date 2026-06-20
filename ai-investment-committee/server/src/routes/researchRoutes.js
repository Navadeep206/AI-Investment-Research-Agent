import express from 'express';
import { createInvestmentResearch } from '../controllers/researchController.js';

const router = express.Router();

// Define route
router.post('/research', createInvestmentResearch);

export default router;
