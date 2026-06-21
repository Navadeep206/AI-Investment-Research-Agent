import analysisService from './analysisService.js';
import prisma from '../config/prisma.js';
import { MAX_ANALYSIS_AGE_HOURS } from '../config/cacheConfig.js';

class CacheService {
  /**
   * Retrieves the latest analysis for a company case-insensitively.
   */
  async getLatestAnalysis(company) {
    return await analysisService.getLatestAnalysisByCompany(company);
  }

  /**
   * Helper to compute age in hours since creation.
   */
  calculateAgeHours(createdAt) {
    if (!createdAt) return 0;
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const age = diffMs / (1000 * 60 * 60);
    return Math.max(0, parseFloat(age.toFixed(2)));
  }

  /**
   * Verifies if a given timestamp falls within the fresh cache window (e.g. < 24 hours).
   */
  isAnalysisFresh(createdAt) {
    if (!createdAt) return false;
    const ageHours = this.calculateAgeHours(createdAt);
    return ageHours < MAX_ANALYSIS_AGE_HOURS;
  }

  /**
   * Main caching entry point. Returns cached analysis if fresh,
   * otherwise executes the provided workflow function to generate and persist fresh data.
   * 
   * @param {string} company Company search ticker/name
   * @param {Function} executeWorkflow Async callback to generate fresh analysis and save it
   * @returns {Promise<Object>} Formatted response object containing cache metadata
   */
  async getOrRefreshAnalysis(company, executeWorkflow) {
    // 1. Try raw query name first
    let latest = await this.getLatestAnalysis(company);
    let matchedCompany = company;

    if (latest) {
      const ageHours = this.calculateAgeHours(latest.createdAt);
      if (this.isAnalysisFresh(latest.createdAt)) {
        console.log(`[Cache Service] Cache HIT for "${company}". Age: ${ageHours} hours.`);
        return {
          analysisId: latest.id,
          company: latest.company,
          dataSource: "CACHE",
          generatedAt: latest.createdAt,
          ageHours,
          analysis: {
            research: latest.research,
            scorecard: latest.scorecard,
            challenge: latest.challenge,
            finalDecision: latest.finalDecision
          }
        };
      }
      console.log(`[Cache Service] Cache STALE for "${company}". Age: ${ageHours} hours. Refreshing...`);
    }

    // 2. Resolve official name via Yahoo Finance search to check normalized cache key
    try {
      const { default: companyResearchService } = await import('./companyResearchService.js');
      const marketInfo = await companyResearchService.fetchMarketData(company);
      if (marketInfo && marketInfo.companyName && marketInfo.companyName.toLowerCase() !== company.toLowerCase()) {
        console.log(`[Cache Service] Normalizing query "${company}" to official name "${marketInfo.companyName}"`);
        matchedCompany = marketInfo.companyName;
        
        latest = await this.getLatestAnalysis(matchedCompany);
        if (latest) {
          const ageHours = this.calculateAgeHours(latest.createdAt);
          if (this.isAnalysisFresh(latest.createdAt)) {
            console.log(`[Cache Service] Cache HIT for normalized name "${matchedCompany}". Age: ${ageHours} hours.`);
            return {
              analysisId: latest.id,
              company: latest.company,
              dataSource: "CACHE",
              generatedAt: latest.createdAt,
              ageHours,
              analysis: {
                research: latest.research,
                scorecard: latest.scorecard,
                challenge: latest.challenge,
                finalDecision: latest.finalDecision
              }
            };
          }
          console.log(`[Cache Service] Cache STALE for normalized name "${matchedCompany}". Age: ${ageHours} hours. Refreshing...`);
        }
      }
    } catch (err) {
      console.warn(`[Cache Service] Could not resolve official name for "${company}":`, err.message);
    }

    console.log(`[Cache Service] Cache MISS for "${matchedCompany}". Generating fresh analysis...`);
    
    // Cache miss or stale: Run the workflow callback to generate a new record using normalized name
    const fresh = await executeWorkflow(matchedCompany);

    return {
      analysisId: fresh.analysisId,
      company: fresh.company,
      dataSource: "FRESH_ANALYSIS",
      generatedAt: fresh.createdAt || new Date(),
      ageHours: 0,
      analysis: fresh.analysis
    };
  }

  /**
   * Comparison engine helper. Uses fresh cache if it exists,
   * otherwise executes the workflow to generate and save a new record.
   * 
   * @param {string} company Company search ticker/name
   * @param {Function} executeWorkflow Async callback to run if cache miss
   * @returns {Promise<Object>} The raw analysis details (either cached or fresh)
   */
  async getAnalysisForComparison(company, executeWorkflow) {
    let latest = await this.getLatestAnalysis(company);
    let matchedCompany = company;

    if (latest && this.isAnalysisFresh(latest.createdAt)) {
      console.log(`[Cache Service] Comparison query: Cache HIT for "${company}".`);
      return latest;
    }

    try {
      const { default: companyResearchService } = await import('./companyResearchService.js');
      const marketInfo = await companyResearchService.fetchMarketData(company);
      if (marketInfo && marketInfo.companyName && marketInfo.companyName.toLowerCase() !== company.toLowerCase()) {
        matchedCompany = marketInfo.companyName;
        latest = await this.getLatestAnalysis(matchedCompany);
        if (latest && this.isAnalysisFresh(latest.createdAt)) {
          console.log(`[Cache Service] Comparison query: Cache HIT for normalized name "${matchedCompany}".`);
          return latest;
        }
      }
    } catch (err) {
      console.warn(`[Cache Service] Comparison: name resolution failed for "${company}":`, err.message);
    }

    console.log(`[Cache Service] Comparison query: Cache MISS/STALE for "${matchedCompany}". Generating...`);
    const fresh = await executeWorkflow(matchedCompany);
    
    // Retrieve the fully saved database record for the comparison engine
    return await analysisService.getAnalysisById(fresh.analysisId);
  }

  /**
   * Compiles aggregate statistics regarding cache status.
   * 
   * @returns {Promise<Object>} Cache stats mapping
   */
  async getCacheStats() {
    try {
      const totalAnalyses = await prisma.analysis.count();

      // Cutoff for 24 hours freshness window
      const freshCutoff = new Date(Date.now() - MAX_ANALYSIS_AGE_HOURS * 60 * 60 * 1000);
      
      const freshAnalyses = await prisma.analysis.count({
        where: {
          createdAt: {
            gte: freshCutoff
          }
        }
      });

      const staleAnalyses = totalAnalyses - freshAnalyses;
      const cacheHitRate = totalAnalyses > 0 
        ? parseFloat(((freshAnalyses / totalAnalyses) * 100).toFixed(2))
        : 0;

      return {
        totalAnalyses,
        freshAnalyses,
        staleAnalyses,
        cacheHitRate: `${cacheHitRate}%`
      };
    } catch (error) {
      console.error("[Cache Service] Failed to retrieve cache stats:", error.message);
      throw error;
    }
  }
}

export default new CacheService();
