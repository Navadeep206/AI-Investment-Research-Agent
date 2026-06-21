import analysisService from './analysisService.js';
import prisma from '../config/prisma.js';
import { MAX_ANALYSIS_AGE_HOURS, MIN_DATA_QUALITY } from '../config/cacheConfig.js';

class CacheService {
  constructor() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.cacheRepairs = 0;
  }

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
   * Helper to verify if an analysis is complete.
   * Return true only if dataQuality >= 80 and the required fields exist.
   */
  isAnalysisComplete(analysis) {
    if (!analysis) return false;

    const fields = [
      'businessQuality',
      'growthPotential',
      'competitiveMoat',
      'financialStrength',
      'riskLevel',
      'overallScore',
      'recommendation'
    ];

    const scorecard = analysis.scorecard || {};
    const finalDecision = analysis.finalDecision || {};

    const getVal = (field) => {
      if (scorecard[field] !== undefined && scorecard[field] !== null) return scorecard[field];
      if (finalDecision[field] !== undefined && finalDecision[field] !== null) return finalDecision[field];
      if (analysis[field] !== undefined && analysis[field] !== null) return analysis[field];
      return null;
    };

    let missingCount = 0;
    for (const field of fields) {
      if (getVal(field) === null) {
        missingCount++;
      }
    }

    const dataQuality = Math.max(0, 100 - (missingCount * 20));

    if (dataQuality < MIN_DATA_QUALITY) {
      return false;
    }

    for (const field of fields) {
      if (getVal(field) === null) {
        return false;
      }
    }

    return true;
  }


  /**
   * Main caching entry point. Returns cached analysis if fresh and complete,
   * otherwise executes the provided workflow function to generate and persist fresh data.
   * 
   * @param {string} company Company search ticker/name
   * @param {Function} executeWorkflow Async callback to generate fresh analysis and save it
   * @returns {Promise<Object>} Formatted response object containing cache metadata
   */
  async getOrRefreshAnalysis(company, executeWorkflow) {
    let latest = await this.getLatestAnalysis(company);
    let matchedCompany = company;
    let hasRecord = false;
    let isStale = false;
    let isIncomplete = false;

    if (latest) {
      hasRecord = true;
      const ageHours = this.calculateAgeHours(latest.createdAt);
      const isFresh = this.isAnalysisFresh(latest.createdAt);
      const isComplete = this.isAnalysisComplete(latest);

      if (isFresh && isComplete) {
        console.log(`[Cache Service] Cache HIT for "${company}". Age: ${ageHours} hours.`);
        this.cacheHits++;
        return {
          analysisId: latest.id,
          company: latest.company,
          dataSource: "CACHE",
          cacheReason: "fresh_cache",
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

      if (!isFresh) {
        isStale = true;
      } else if (!isComplete) {
        isIncomplete = true;
      }
    }

    try {
      const { default: companyResearchService } = await import('./companyResearchService.js');
      const marketInfo = await companyResearchService.fetchMarketData(company);
      if (marketInfo && marketInfo.companyName && marketInfo.companyName.toLowerCase() !== company.toLowerCase()) {
        console.log(`[Cache Service] Normalizing query "${company}" to official name "${marketInfo.companyName}"`);
        matchedCompany = marketInfo.companyName;
        
        let normalizedLatest = await this.getLatestAnalysis(matchedCompany);
        if (normalizedLatest) {
          hasRecord = true;
          const ageHours = this.calculateAgeHours(normalizedLatest.createdAt);
          const isFresh = this.isAnalysisFresh(normalizedLatest.createdAt);
          const isComplete = this.isAnalysisComplete(normalizedLatest);

          if (isFresh && isComplete) {
            console.log(`[Cache Service] Cache HIT for normalized name "${matchedCompany}". Age: ${ageHours} hours.`);
            this.cacheHits++;
            return {
              analysisId: normalizedLatest.id,
              company: normalizedLatest.company,
              dataSource: "CACHE",
              cacheReason: "fresh_cache",
              generatedAt: normalizedLatest.createdAt,
              ageHours,
              analysis: {
                research: normalizedLatest.research,
                scorecard: normalizedLatest.scorecard,
                challenge: normalizedLatest.challenge,
                finalDecision: normalizedLatest.finalDecision
              }
            };
          }

          if (!isFresh) {
            isStale = true;
          } else if (!isComplete) {
            isIncomplete = true;
          }
        }
      }
    } catch (err) {
      console.warn(`[Cache Service] Could not resolve official name for "${company}":`, err.message);
    }

    if (hasRecord && isIncomplete && !isStale) {
      console.log(`[Cache Service] Cache REPAIR for "${matchedCompany}". Fresh but incomplete scorecard. Auto-repairing...`);
      const fresh = await executeWorkflow(matchedCompany);
      this.cacheRepairs++;
      return {
        analysisId: fresh.analysisId,
        company: fresh.company,
        dataSource: "CACHE_REPAIRED",
        cacheReason: "incomplete_cache",
        generatedAt: fresh.createdAt || new Date(),
        ageHours: 0,
        analysis: fresh.analysis
      };
    }

    console.log(`[Cache Service] Cache MISS/STALE for "${matchedCompany}". Generating fresh analysis...`);
    const fresh = await executeWorkflow(matchedCompany);
    this.cacheMisses++;
    return {
      analysisId: fresh.analysisId,
      company: fresh.company,
      dataSource: "FRESH_ANALYSIS",
      cacheReason: "stale_cache",
      generatedAt: fresh.createdAt || new Date(),
      ageHours: 0,
      analysis: fresh.analysis
    };
  }

  /**
   * Comparison engine helper. Uses fresh/complete cache if it exists,
   * otherwise executes the workflow to generate/repair and save a new record.
   * 
   * @param {string} company Company search ticker/name
   * @param {Function} executeWorkflow Async callback to run if cache miss
   * @returns {Promise<Object>} The raw analysis details (either cached or fresh)
   */
  async getAnalysisForComparison(company, executeWorkflow) {
    let latest = await this.getLatestAnalysis(company);
    let matchedCompany = company;
    let hasRecord = false;
    let isStale = false;
    let isIncomplete = false;

    if (latest) {
      hasRecord = true;
      const isFresh = this.isAnalysisFresh(latest.createdAt);
      const isComplete = this.isAnalysisComplete(latest);

      if (isFresh && isComplete) {
        console.log(`[Cache Service] Comparison query: Cache HIT for "${company}".`);
        this.cacheHits++;
        return latest;
      }

      if (!isFresh) {
        isStale = true;
      } else if (!isComplete) {
        isIncomplete = true;
      }
    }

    try {
      const { default: companyResearchService } = await import('./companyResearchService.js');
      const marketInfo = await companyResearchService.fetchMarketData(company);
      if (marketInfo && marketInfo.companyName && marketInfo.companyName.toLowerCase() !== company.toLowerCase()) {
        matchedCompany = marketInfo.companyName;
        let normalizedLatest = await this.getLatestAnalysis(matchedCompany);
        if (normalizedLatest) {
          hasRecord = true;
          const isFresh = this.isAnalysisFresh(normalizedLatest.createdAt);
          const isComplete = this.isAnalysisComplete(normalizedLatest);

          if (isFresh && isComplete) {
            console.log(`[Cache Service] Comparison query: Cache HIT for normalized name "${matchedCompany}".`);
            this.cacheHits++;
            return normalizedLatest;
          }

          if (!isFresh) {
            isStale = true;
          } else if (!isComplete) {
            isIncomplete = true;
          }
        }
      }
    } catch (err) {
      console.warn(`[Cache Service] Comparison: name resolution failed for "${company}":`, err.message);
    }

    if (hasRecord && isIncomplete && !isStale) {
      console.log(`[Cache Service] Comparison query: Cache REPAIR for "${matchedCompany}". Auto-repairing...`);
      const fresh = await executeWorkflow(matchedCompany);
      this.cacheRepairs++;
      return await analysisService.getAnalysisById(fresh.analysisId);
    }

    console.log(`[Cache Service] Comparison query: Cache MISS/STALE for "${matchedCompany}". Generating...`);
    const fresh = await executeWorkflow(matchedCompany);
    this.cacheMisses++;
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
        cacheHitRate: `${cacheHitRate}%`,
        cacheHits: this.cacheHits,
        cacheMisses: this.cacheMisses,
        cacheRepairs: this.cacheRepairs
      };
    } catch (error) {
      console.error("[Cache Service] Failed to retrieve cache stats:", error.message);
      throw error;
    }
  }

}

export default new CacheService();
