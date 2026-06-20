import companyResearchService from '../services/companyResearchService.js';
import { runResearchAgent } from '../agents/researchAgent.js';

/**
 * Handles investment research analysis requests.
 * POST /api/research
 */
export const createInvestmentResearch = async (req, res, next) => {
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
    console.log(`[Research Controller] Commencing research phase for "${companyQueryName}"...`);

    // Step 1: Query the existing company Research Service
    let companyData;
    try {
      companyData = await companyResearchService.getCompanyResearch(companyQueryName);
    } catch (serviceErr) {
      console.error(`[Research Controller] Company details lookup failed: ${serviceErr.message}`);
      return res.status(404).json({
        success: false,
        message: `Could not retrieve company profile or market metrics for "${companyQueryName}": ${serviceErr.message}`
      });
    }

    // Step 2: Pass aggregated company profile to Gemini via the Research Agent
    try {
      const report = await runResearchAgent(companyData);
      
      // Step 3: Return formatted report response
      return res.status(200).json({
        success: true,
        company: companyData.company,
        report
      });
    } catch (agentErr) {
      console.error(`[Research Controller] Agent execution failed:`, agentErr.stack);
      return res.status(502).json({
        success: false,
        error: 'Research generation failed'
      });
    }
  } catch (error) {
    console.error('[Research Controller] Unexpected error:', error.stack);
    next(error);
  }
};
