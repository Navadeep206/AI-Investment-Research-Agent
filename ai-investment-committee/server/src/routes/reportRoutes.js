import express from 'express';
import { generateReportPDF, generateComparisonReportPDF, generatePortfolioReportPDF } from '../controllers/reportController.js';

const router = express.Router();

/**
 * Route definition for downloading a generated PDF comparison report.
 * GET /api/report/compare
 */
router.get('/report/compare', generateComparisonReportPDF);

/**
 * Route definition for downloading a generated PDF portfolio report.
 * GET /api/report/portfolio
 */
router.get('/report/portfolio', generatePortfolioReportPDF);

/**
 * Route definition for downloading a generated PDF analysis report.
 * GET /api/report/:analysisId
 */
router.get('/report/:analysisId', generateReportPDF);

export default router;
