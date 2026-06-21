import analysisService from '../services/analysisService.js';
import cacheService from '../services/cacheService.js';

/**
 * Executes the entire LangGraph investment workflow for a given company.
 * POST /api/analyze
 */
export const analyzeCompany = async (req, res, next) => {
  try {
    const { company } = req.body;

    // Validate request body parameter
    if (!company || typeof company !== 'string' || !company.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body. "company" name parameter is required.'
      });
    }

    const companyQueryName = company.trim();
    console.log(`[Analysis Controller] Commencing caching-aware workflow analysis for "${companyQueryName}"...`);

    // Callback workflow function to invoke if there is a cache miss or stale cache
    const executeWorkflow = async (resolvedName) => {
      const nameToQuery = resolvedName || companyQueryName;
      return await analysisService.runFullAnalysisAndSave(nameToQuery);
    };

    // Run cache service wrapper coordinator
    const result = await cacheService.getOrRefreshAnalysis(companyQueryName, executeWorkflow);

    // Return cached or fresh analysis response matching spec
    return res.status(200).json({
      success: true,
      analysisId: result.analysisId,
      company: result.company,
      dataSource: result.dataSource,
      cacheReason: result.cacheReason,
      generatedAt: result.generatedAt,
      ageHours: result.ageHours,
      analysis: result.analysis
    });

  } catch (error) {
    console.error('[Analysis Controller] Unexpected error:', error.stack);
    next(error);
  }
};
