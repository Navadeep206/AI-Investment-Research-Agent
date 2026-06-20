import express from 'express';
import { createInvestmentChallenge } from '../controllers/challengeController.js';

const router = express.Router();

// Define route
router.post('/challenge', createInvestmentChallenge);

export default router;
