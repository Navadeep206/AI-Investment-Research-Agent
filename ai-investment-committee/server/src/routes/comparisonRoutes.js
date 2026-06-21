import { Router } from 'express';
import { compareCompanies } from '../controllers/comparisonController.js';

const router = Router();

// Endpoint for side-by-side company comparison
router.post('/compare', compareCompanies);

export default router;
