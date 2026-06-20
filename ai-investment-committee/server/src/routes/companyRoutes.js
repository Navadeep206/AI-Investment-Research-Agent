import express from 'express';
import { getCompanyIntelligence, getCompanyDebugIntelligence } from '../controllers/companyController.js';

const router = express.Router();

// Define route
router.get('/company/:name', getCompanyIntelligence);
router.get('/debug/company/:name', getCompanyDebugIntelligence);

export default router;
