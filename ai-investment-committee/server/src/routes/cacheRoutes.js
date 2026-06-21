import express from 'express';
import { getStats } from '../controllers/cacheController.js';

const router = express.Router();

router.get('/cache-stats', getStats);

export default router;
