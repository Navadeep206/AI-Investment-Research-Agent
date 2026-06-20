import companyResearchService from '../services/companyResearchService.js';
import { runResearchAgent } from '../agents/researchAgent.js';
import { runScoringAgent } from '../agents/scoringAgent.js';

/**
 * Coordinates company research followed by automated scorecard grading.
 * POST /api/score
 */
export const createInvestmentScore = async (req, res, next) => {
  try {
    const { company } = req.body;

    // Validate body parameter
    if (!company || typeof company !== 'string' || !company.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body. "company" name parameter is required.'
      });
    }

    const companyQueryName = company.trim();
    console.log(`[Scoring Controller] Commencing valuation grading for "${companyQueryName}"...`);

    // Step 1: Query company overview profile
    let companyData;
    try {
      companyData = await companyResearchService.getCompanyResearch(companyQueryName);
    } catch (serviceErr) {
      console.error(`[Scoring Controller] Company research service error: ${serviceErr.message}`);
      return res.status(404).json({
        success: false,
        message: `Could not retrieve company profile or market metrics for "${companyQueryName}": ${serviceErr.message}`
      });
    }

    // Step 2: Query Research Analyst Agent to compile the investment report
    let researchReport;
    try {
      console.log(`[Scoring Controller] Running Research Analyst Agent for "${companyData.company}"...`);
      researchReport = await runResearchAgent(companyData);
    } catch (researchErr) {
      console.error(`[Scoring Controller] Research Agent failed: ${researchErr.message}`);
      return res.status(502).json({
        success: false,
        error: 'Scoring generation failed'
      });
    }

    // Step 3: Run the Scoring Agent using the compiled report
    try {
      console.log(`[Scoring Controller] Running Investment Scoring Agent for "${companyData.company}"...`);
      const scorecard = await runScoringAgent(companyData.company, researchReport);

      return res.status(200).json({
        success: true,
        company: companyData.company,
        scorecard
      });
    } catch (scoringErr) {
      console.error(`[Scoring Controller] Scoring Agent failed: ${scoringErr.message}`);
      return res.status(502).json({
        success: false,
        error: 'Scoring generation failed'
      });
    }
  } catch (error) {
    console.error('[Scoring Controller] Unexpected error:', error.stack);
    next(error);
  }
};
