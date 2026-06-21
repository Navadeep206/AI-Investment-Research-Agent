import companyResearchService from '../services/companyResearchService.js';
import { runResearchAgent } from '../agents/researchAgent.js';
import { runScoringAgent } from '../agents/scoringAgent.js';
import { runDevilAdvocateAgent } from '../agents/devilAdvocateAgent.js';
import evidenceService from '../services/evidenceService.js';

/**
 * Coordinates company lookup, research, scoring, and adversarial thesis challenging.
 * POST /api/challenge
 */
export const createInvestmentChallenge = async (req, res, next) => {
  try {
    const { company } = req.body;

    // Validate parameter
    if (!company || typeof company !== 'string' || !company.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body. "company" name parameter is required.'
      });
    }

    const companyQueryName = company.trim();
    console.log(`[Challenge Controller] Initiating adversarial review phase for "${companyQueryName}"...`);

    // Step 1: Query company overview profile and search evidence in parallel
    let companyData;
    let evidence = [];
    try {
      const [researchData, evidenceData] = await Promise.all([
        companyResearchService.getCompanyResearch(companyQueryName),
        evidenceService.collectEvidence(companyQueryName).catch(err => {
          console.warn(`[Challenge Controller] Evidence collection failed: ${err.message}`);
          return [];
        })
      ]);
      companyData = researchData;
      evidence = evidenceData;
    } catch (serviceErr) {
      console.error(`[Challenge Controller] Company research service error: ${serviceErr.message}`);
      return res.status(404).json({
        success: false,
        message: `Could not retrieve company profile or market metrics for "${companyQueryName}": ${serviceErr.message}`
      });
    }

    // Step 2: Query Research Analyst Agent to compile the investment report
    let researchReport;
    try {
      console.log(`[Challenge Controller] Running Research Analyst Agent for "${companyData.company}"...`);
      researchReport = await runResearchAgent(companyData, evidence);
    } catch (researchErr) {
      console.error(`[Challenge Controller] Research Agent failed: ${researchErr.message}`);
      return res.status(502).json({
        success: false,
        error: 'Thesis challenge failed'
      });
    }

    // Step 3: Run the Scoring Agent using the compiled report
    let scorecard;
    try {
      console.log(`[Challenge Controller] Running Investment Scoring Agent for "${companyData.company}"...`);
      scorecard = await runScoringAgent(companyData.company, researchReport);
    } catch (scoringErr) {
      console.error(`[Challenge Controller] Scoring Agent failed: ${scoringErr.message}`);
      return res.status(502).json({
        success: false,
        error: 'Thesis challenge failed'
      });
    }

    // Step 4: Run the Devil's Advocate Agent using the report and scorecard
    try {
      console.log(`[Challenge Controller] Running Devil's Advocate Agent for "${companyData.company}"...`);
      const challenge = await runDevilAdvocateAgent(companyData.company, researchReport, scorecard);

      return res.status(200).json({
        success: true,
        company: companyData.company,
        challenge
      });
    } catch (challengeErr) {
      console.error(`[Challenge Controller] Devil's Advocate Agent failed: ${challengeErr.message}`);
      return res.status(502).json({
        success: false,
        error: 'Thesis challenge failed'
      });
    }
  } catch (error) {
    console.error('[Challenge Controller] Unexpected error:', error.stack);
    next(error);
  }
};
