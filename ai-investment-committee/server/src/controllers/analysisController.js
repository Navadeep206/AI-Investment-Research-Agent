import companyResearchService from '../services/companyResearchService.js';
import { investmentGraph } from '../graph/investmentGraph.js';

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
    console.log(`[Analysis Controller] Commencing full LangGraph workflow analysis for "${companyQueryName}"...`);

    // Step 1: Query company profile and market metrics
    let companyData;
    try {
      companyData = await companyResearchService.getCompanyResearch(companyQueryName);
    } catch (serviceErr) {
      console.error(`[Analysis Controller] Company lookup failed: ${serviceErr.message}`);
      return res.status(404).json({
        success: false,
        message: `Could not retrieve company profile or market metrics for "${companyQueryName}": ${serviceErr.message}`
      });
    }

    // Step 2: Run the LangGraph StateGraph workflow
    try {
      console.log(`[Analysis Controller] Invoking LangGraph workflow for "${companyData.company}"...`);
      const result = await investmentGraph.invoke({
        company: companyData.company,
        companyData: companyData
      });

      // Step 3: Return consolidated final analysis response
      return res.status(200).json({
        success: true,
        company: companyData.company,
        analysis: {
          research: result.research,
          scorecard: result.scorecard,
          challenge: result.challenge,
          finalDecision: result.finalDecision
        }
      });
    } catch (graphErr) {
      console.error(`[Analysis Controller] LangGraph execution failed:`, graphErr.stack);
      return res.status(502).json({
        success: false,
        error: 'LangGraph workflow execution failed'
      });
    }
  } catch (error) {
    console.error('[Analysis Controller] Unexpected error:', error.stack);
    next(error);
  }
};
