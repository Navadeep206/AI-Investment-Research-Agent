import companyResearchService from '../services/companyResearchService.js';
import { investmentGraph } from '../graph/investmentGraph.js';
import evidenceService from '../services/evidenceService.js';
import sourceRankingService from '../services/sourceRankingService.js';
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
      // Step 1: Query company profile, market metrics and search evidence in parallel
      let companyData;
      let evidence = [];
      let evidenceMetrics = null;
      
      const [researchData, evidenceData] = await Promise.all([
        companyResearchService.getCompanyResearch(nameToQuery),
        evidenceService.collectEvidence(nameToQuery).catch(err => {
          console.warn(`[Analysis Controller] Evidence collection failed: ${err.message}`);
          return [];
        })
      ]);
      
      const { rankedEvidence, metrics } = sourceRankingService.rankEvidence(evidenceData);
      companyData = researchData;
      evidence = rankedEvidence;
      evidenceMetrics = metrics;

      // Step 2: Run the LangGraph StateGraph workflow
      console.log(`[Analysis Controller] Invoking LangGraph workflow for "${companyData.company}"...`);
      const result = await investmentGraph.invoke({
        company: companyData.company,
        companyData: companyData,
        evidence: evidence,
        evidenceMetrics: evidenceMetrics
      });

      // Step 3: Persist analysis to database
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

      return {
        analysisId: saved.id,
        company: companyData.company,
        createdAt: saved.createdAt,
        analysis: {
          research: result.research,
          scorecard: result.scorecard,
          challenge: result.challenge,
          finalDecision: result.finalDecision
        }
      };
    };

    // Run cache service wrapper coordinator
    const result = await cacheService.getOrRefreshAnalysis(companyQueryName, executeWorkflow);

    // Return cached or fresh analysis response matching spec
    return res.status(200).json({
      success: true,
      analysisId: result.analysisId,
      company: result.company,
      dataSource: result.dataSource,
      generatedAt: result.generatedAt,
      ageHours: result.ageHours,
      analysis: result.analysis
    });
  } catch (error) {
    console.error('[Analysis Controller] Unexpected error:', error.stack);
    next(error);
  }
};
