import comparisonService from '../services/comparisonService.js';

/**
 * Express controller handler comparing two companies side-by-side.
 * POST /api/compare
 */
export const compareCompanies = async (req, res, next) => {
  try {
    const { companyA, companyB } = req.body;

    // Validate parameters
    if (!companyA || typeof companyA !== 'string' || !companyA.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body. "companyA" name parameter is required.'
      });
    }

    if (!companyB || typeof companyB !== 'string' || !companyB.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body. "companyB" name parameter is required.'
      });
    }

    const cleanCompanyA = companyA.trim();
    const cleanCompanyB = companyB.trim();

    if (cleanCompanyA.toLowerCase() === cleanCompanyB.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request. Cannot compare a company with itself.'
      });
    }

    console.log(`[Comparison Controller] Invoking side-by-side comparison for "${cleanCompanyA}" vs "${cleanCompanyB}"`);
    
    const result = await comparisonService.compareCompanies(cleanCompanyA, cleanCompanyB);

    return res.status(200).json(result);
  } catch (error) {
    console.error('[Comparison Controller] Comparison failed:', error.stack);
    next(error);
  }
};
