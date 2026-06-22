import prisma from '../config/prisma.js';
import freshnessService from './freshnessService.js';

class AnalysisService {
  /**
   * Helper to format database record, dynamically calculating freshness variables.
   */
  formatAnalysisRecord(record) {
    if (!record) return null;
    const freshness = freshnessService.calculateFreshness(record.createdAt);
    
    const dataQualityScore = record.finalDecision?.dataQualityScore !== undefined
      ? record.finalDecision.dataQualityScore
      : 100;
      
    const recommendationReasonCodes = record.finalDecision?.recommendationReasonCodes || [];

    const updatedFinalDecision = {
      ...(record.finalDecision || {}),
      evidenceAgeMinutes: freshness.evidenceAgeMinutes,
      freshnessScore: freshness.freshnessScore,
      freshnessStatus: freshness.status,
      dataQualityScore,
      recommendationReasonCodes
    };

    return {
      ...record,
      evidenceAgeMinutes: freshness.evidenceAgeMinutes,
      freshnessScore: freshness.freshnessScore,
      freshnessStatus: freshness.status,
      dataQualityScore,
      recommendationReasonCodes,
      finalDecision: updatedFinalDecision
    };
  }
  /**
   * Persists a completed investment committee analysis.
   * 
   * @param {Object} data Summary details and agent reports
   * @returns {Promise<Object>} The saved Prisma Analysis record
   */
  async saveAnalysis(data) {
    try {
      console.log(`[Analysis Service] Persisting investment report for "${data.company}" to database...`);
      return await prisma.analysis.create({
        data: {
          company: data.company,
          industry: data.industry,
          marketCap: data.marketCap,
          overallScore: data.overallScore,
          recommendation: data.recommendation,
          confidence: data.confidence,
          sourcesUsed: data.sourcesUsed,
          evidenceQualityScore: data.evidenceQualityScore,
          research: data.research,
          scorecard: data.scorecard,
          challenge: data.challenge,
          finalDecision: data.finalDecision,
          requestId: data.requestId,
          confidenceBreakdown: data.confidenceBreakdown,
          agentMetrics: data.agentMetrics,
          materialEventCount: data.materialEventCount,
          lastMaterialEventAt: data.lastMaterialEventAt ? new Date(data.lastMaterialEventAt) : null
        }
      });
    } catch (error) {
      console.error("[Analysis Service] Error saving analysis to PostgreSQL:", error.message);
      throw error;
    }
  }

  /**
   * Retrieves the full analysis history ordered newest first.
   * 
   * @returns {Promise<Array>} List of analysis records
   */
  async getAnalysisHistory() {
    try {
      console.log("[Analysis Service] Fetching analysis history records...");
      const history = await prisma.analysis.findMany({
        orderBy: {
          createdAt: 'desc'
        }
      });
      return history.map(h => this.formatAnalysisRecord(h));
    } catch (error) {
      console.error("[Analysis Service] Error querying analysis history:", error.message);
      throw error;
    }
  }

  /**
   * Retrieves a single analysis record by ID.
   * 
   * @param {string} id The analysis CUID ID
   * @returns {Promise<Object|null>} The database record or null if not found
   */
  async getAnalysisById(id) {
    try {
      console.log(`[Analysis Service] Querying analysis by ID: "${id}"`);
      const record = await prisma.analysis.findUnique({
        where: { id }
      });
      return this.formatAnalysisRecord(record);
    } catch (error) {
      console.error(`[Analysis Service] Error querying ID "${id}":`, error.message);
      throw error;
    }
  }

  /**
   * Deletes an analysis record by ID.
   * 
   * @param {string} id The analysis ID
   * @returns {Promise<Object>} The deleted database record details
   */
  async deleteAnalysis(id) {
    try {
      console.log(`[Analysis Service] Deleting analysis record: "${id}"`);
      return await prisma.analysis.delete({
        where: { id }
      });
    } catch (error) {
      console.error(`[Analysis Service] Error deleting ID "${id}":`, error.message);
      throw error;
    }
  }

  /**
   * Retrieves the newest completed analysis matching the company name case-insensitively.
   * 
   * @param {string} company The name of the company or ticker
   * @returns {Promise<Object|null>} The newest database record or null
   */
  async getLatestAnalysisByCompany(company) {
    try {
      const companyName = (company || "").trim();
      console.log(`[Analysis Service] Querying latest analysis record for: "${companyName}"`);
      const record = await prisma.analysis.findFirst({
        where: {
          company: {
            equals: companyName,
            mode: 'insensitive'
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      return this.formatAnalysisRecord(record);
    } catch (error) {
      console.error(`[Analysis Service] Error querying latest analysis for "${company}":`, error.message);
      throw error;
    }
  }

  /**
   * Generates a fresh analysis by orchestrating Wikipedia/Yahoo research, Tavily evidence searches,
   * source ranking, the multi-agent LangGraph workflow execution, and persisting the resulting reports.
   * 
   * @param {string} companyQueryName The target company name
   * @returns {Promise<Object>} Formatted object matching executeWorkflow expectations
   */
  async runFullAnalysisAndSave(companyQueryName, preFetchedCompanyData = null, sessionId = null, requestId = null, eventMetricsData = null) {
    const { default: companyResearchService } = await import('./companyResearchService.js');
    const { investmentGraph } = await import('../graph/investmentGraph.js');
    const { default: evidenceService } = await import('./evidenceService.js');
    const { default: sourceRankingService } = await import('./sourceRankingService.js');

    // Step 1: Query company profile, market metrics and search evidence in parallel
    let companyData;
    let evidence = [];
    let evidenceMetrics = null;
    
    const researchPromise = preFetchedCompanyData
      ? Promise.resolve(preFetchedCompanyData)
      : companyResearchService.getCompanyResearch(companyQueryName);

    const [researchData, evidenceData] = await Promise.all([
      researchPromise,
      evidenceService.collectEvidence(companyQueryName).catch(err => {
        console.warn(`[Analysis Service] Evidence collection failed: ${err.message}`);
        return [];
      })
    ]);
    
    const { rankedEvidence, metrics } = sourceRankingService.rankEvidence(evidenceData);
    companyData = researchData;
    evidence = rankedEvidence;
    evidenceMetrics = metrics;

    // Step 2: Run the LangGraph StateGraph workflow
    console.log(`[Analysis Service] Invoking LangGraph workflow for "${companyData.company}"...`);
    if (sessionId) {
      const { default: executionTracker } = await import('./executionTracker.js');
      executionTracker.initializeSession(sessionId);
    }
    const result = await investmentGraph.invoke({
      company: companyData.company,
      companyData: companyData,
      evidence: evidence,
      evidenceMetrics: evidenceMetrics,
      sessionId: sessionId,
      requestId: requestId
    });

    // Step 3: Persist analysis to database
    const finalDecisionToSave = result.finalDecision ? {
      ...result.finalDecision,
      materialEvents: eventMetricsData ? eventMetricsData.events : []
    } : null;

    const researchToSave = result.research ? {
      ...result.research,
      evidence: evidence || []
    } : null;

    const saved = await this.saveAnalysis({
      company: companyData.company,
      industry: companyData.industry,
      marketCap: companyData.marketCap,
      overallScore: result.scorecard ? result.scorecard.overallScore : null,
      recommendation: result.finalDecision ? result.finalDecision.recommendation : null,
      confidence: result.finalDecision ? result.finalDecision.confidence : null,
      sourcesUsed: evidence ? evidence.length : 0,
      evidenceQualityScore: evidenceMetrics ? evidenceMetrics.evidenceQualityScore : 0,
      research: researchToSave,
      scorecard: result.scorecard,
      challenge: result.challenge,
      finalDecision: finalDecisionToSave,
      requestId: requestId,
      confidenceBreakdown: result.finalDecision ? result.finalDecision.confidenceBreakdown : null,
      agentMetrics: result.agentMetrics || null,
      materialEventCount: eventMetricsData ? eventMetricsData.eventCount : 0,
      lastMaterialEventAt: eventMetricsData ? eventMetricsData.latestEventTimestamp : null
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
  }
}

export default new AnalysisService();
