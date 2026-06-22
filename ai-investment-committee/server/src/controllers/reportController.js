import analysisService from '../services/analysisService.js';
import reportService from '../services/reportService.js';
import comparisonService from '../services/comparisonService.js';
import portfolioService from '../services/portfolioService.js';

/**
 * Handles PDF report generation requests for a given analysis ID.
 * GET /api/report/:analysisId
 */
export const generateReportPDF = async (req, res, next) => {
  try {
    const { analysisId } = req.params;

    // Validate parameters
    if (!analysisId || typeof analysisId !== 'string' || !analysisId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing "analysisId" request parameter.'
      });
    }

    const cleanId = analysisId.trim();
    console.log(`[Report Controller] Compiling PDF report for analysis ID: "${cleanId}"...`);

    // Retrieve full analysis record from database
    const record = await analysisService.getAnalysisById(cleanId);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: `Analysis record not found for ID: "${cleanId}".`
      });
    }

    // Sanitize company name for clean filename headers
    const sanitizedCompany = (record.company || 'Company')
      .trim()
      .replace(/[^a-z0-9]/gi, '_') // Replace non-alphanumeric with underscores
      .replace(/_+/g, '_');        // Merge contiguous underscores

    const filename = `${sanitizedCompany}_Investment_Report.pdf`;

    // Set response headers to trigger file download stream
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream generated PDF bytes to Express response
    reportService.generateReport(record, res);

  } catch (error) {
    console.error('[Report Controller] PDF generation failed:', error.stack || error.message);
    
    // If headers have already been sent, pass error to Express global handler
    if (res.headersSent) {
      return next(error);
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to generate investment PDF report. Check server logs for details.'
    });
  }
};

/**
 * Handles PDF comparison report generation requests.
 * GET /api/report/compare
 */
export const generateComparisonReportPDF = async (req, res, next) => {
  try {
    const { companyA, companyB } = req.query;

    if (!companyA || typeof companyA !== 'string' || !companyA.trim() ||
        !companyB || typeof companyB !== 'string' || !companyB.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid "companyA" or "companyB" query parameters.'
      });
    }

    const cleanA = companyA.trim();
    const cleanB = companyB.trim();

    if (cleanA.toLowerCase() === cleanB.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot compare a company with itself.'
      });
    }

    console.log(`[Report Controller] Compiling PDF report for comparison: "${cleanA}" vs "${cleanB}"`);

    const result = await comparisonService.compareCompanies(cleanA, cleanB);

    const recordA = await analysisService.getLatestAnalysisByCompany(cleanA);
    const recordB = await analysisService.getLatestAnalysisByCompany(cleanB);

    const filename = `${cleanA.toUpperCase()}_vs_${cleanB.toUpperCase()}_Comparison_Report.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    reportService.generateComparisonReport(result, recordA, recordB, res);
  } catch (error) {
    console.error('[Report Controller] PDF comparison generation failed:', error.stack || error.message);
    if (res.headersSent) {
      return next(error);
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to generate investment PDF comparison report. Check server logs.'
    });
  }
};

/**
 * Handles PDF portfolio report generation requests.
 * GET /api/report/portfolio
 */
export const generatePortfolioReportPDF = async (req, res, next) => {
  try {
    const { holdings: holdingsStr } = req.query;

    if (!holdingsStr || typeof holdingsStr !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid "holdings" query parameter.'
      });
    }

    let holdings;
    try {
      holdings = JSON.parse(holdingsStr);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Invalid holdings JSON format.'
      });
    }

    if (!Array.isArray(holdings) || holdings.length === 0) {
      return res.status(400).json({
        success: false,
        message: '"holdings" must be a non-empty array.'
      });
    }

    console.log(`[Report Controller] Compiling PDF report for portfolio with ${holdings.length} assets...`);

    const portfolioResults = await portfolioService.analyzePortfolio(holdings);

    const filename = `Portfolio_Intelligence_Advisory_Report.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    reportService.generatePortfolioReport(portfolioResults, res);
  } catch (error) {
    console.error('[Report Controller] PDF portfolio generation failed:', error.stack || error.message);
    if (res.headersSent) {
      return next(error);
    }
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to generate investment PDF portfolio report. Check server logs.'
    });
  }
};
