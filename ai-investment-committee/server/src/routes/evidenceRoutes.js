import express from 'express';
import { getEvidenceForCompany } from '../controllers/evidenceController.js';

const router = express.Router();

router.post('/evidence', getEvidenceForCompany);

export default router;
