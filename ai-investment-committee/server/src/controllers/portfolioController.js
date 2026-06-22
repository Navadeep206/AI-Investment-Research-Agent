import portfolioService from '../services/portfolioService.js';

/**
 * Handles portfolio analysis requests.
 * POST /api/portfolio/analyze
 */
export const analyzePortfolio = async (req, res, next) => {
  try {
    const { holdings } = req.body;

    // Validate container array
    if (!holdings || !Array.isArray(holdings)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body. "holdings" must be an array of company holdings.'
      });
    }

    if (holdings.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Holdings array cannot be empty. Please configure at least one asset.'
      });
    }

    console.log(`[Portfolio Controller] Triggering multi-asset portfolio vetting for ${holdings.length} assets...`);
    
    // Delegate calculations to portfolio service
    const results = await portfolioService.analyzePortfolio(holdings);

    return res.status(200).json({
      success: true,
      ...results
    });
  } catch (error) {
    console.error('[Portfolio Controller] Execution error:', error.message);
    
    // Check if error is validation-related (e.g. weights sum mismatch)
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
};
