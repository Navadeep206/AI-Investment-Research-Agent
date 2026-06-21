import companyResearchService from '../services/companyResearchService.js';
import { investmentGraph } from '../graph/investmentGraph.js';
import evidenceService from '../services/evidenceService.js';
import sourceRankingService from '../services/sourceRankingService.js';
import analysisService from '../services/analysisService.js';

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

    // Step 1: Query company profile, market metrics and search evidence in parallel
    let companyData;
    let evidence = [];
    let evidenceMetrics = null;
    try {
      const [researchData, evidenceData] = await Promise.all([
        companyResearchService.getCompanyResearch(companyQueryName),
        evidenceService.collectEvidence(companyQueryName).catch(err => {
          console.warn(`[Analysis Controller] Evidence collection failed: ${err.message}`);
          return [];
        })
      ]);
      
      const { rankedEvidence, metrics } = sourceRankingService.rankEvidence(evidenceData);
      companyData = researchData;
      evidence = rankedEvidence;
      evidenceMetrics = metrics;
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
        companyData: companyData,
        evidence: evidence,
        evidenceMetrics: evidenceMetrics
      });

      // Step 3: Automatically save the analysis to the database
      let analysisId = null;
      try {
        const saved = await analysisService.saveAnalysis({
          company: companyData.company,
          industry: companyData.industry,
          marketCap: companyData.marketCap,
          overallScore: result.scorecard ? result.scorecard.overallScore : null,
          recommendation: result.finalDecision ? result.finalDecision.recommendation : null,
          confidence: result.finalDecision ? result.finalDecision.confidence : null,
          sourcesUsed: evidence ? evidence.length : 0,
          evidenceQualityScore: evidenceMetrics ? evidenceMetrics.evidenceQualityScore : 0,
          research: result.research,
          scorecard: result.scorecard,
          challenge: result.challenge,
          finalDecision: result.finalDecision
        });
        analysisId = saved.id;
      } catch (dbErr) {
        console.error(`[Analysis Controller] Failed to persist analysis to database:`, dbErr.message);
      }

      // Step 4: Return consolidated final analysis response
      return res.status(200).json({
        success: true,
        analysisId: analysisId,
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
