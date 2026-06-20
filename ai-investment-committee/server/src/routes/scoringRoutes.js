import express from 'express';
import { createInvestmentScore } from '../controllers/scoringController.js';

const router = express.Router();

// Define route
router.post('/score', createInvestmentScore);

export default router;
