import express from 'express';
import { getHistory, getAnalysis, deleteAnalysis } from '../controllers/historyController.js';

const router = express.Router();

router.get('/history', getHistory);
router.get('/history/:id', getAnalysis);
router.delete('/history/:id', deleteAnalysis);

export default router;
