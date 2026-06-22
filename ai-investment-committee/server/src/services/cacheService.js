import analysisService from './analysisService.js';
import prisma from '../config/prisma.js';
import freshnessService from './freshnessService.js';
import { MAX_ANALYSIS_AGE_HOURS, MIN_DATA_QUALITY } from '../config/cacheConfig.js';
import executionTracker from './executionTracker.js';
import materialEventService from './materialEventService.js';

class CacheService {
  constructor() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.cacheRepairs = 0;
  }

  /**
   * Automatically initializes and completes all agent progress status states in cache hit cases.
   */
  recordCacheHitExecution(sessionId) {
    if (!sessionId) return;
    executionTracker.initializeSession(sessionId);
    executionTracker.startAgent(sessionId, "Research Agent");
    executionTracker.completeAgent(sessionId, "Research Agent", "Retrieved report from PostgreSQL cache.");
    executionTracker.startAgent(sessionId, "Scoring Agent");
    executionTracker.completeAgent(sessionId, "Scoring Agent", "Retrieved scorecard from PostgreSQL cache.");
    executionTracker.startAgent(sessionId, "Devil Advocate Agent");
    executionTracker.completeAgent(sessionId, "Devil Advocate Agent", "Retrieved challenge from PostgreSQL cache.");
    executionTracker.startAgent(sessionId, "Committee Agent");
    executionTracker.completeAgent(sessionId, "Committee Agent", "Retrieved final decision from PostgreSQL cache.");
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
  async getOrRefreshAnalysis(company, executeWorkflow, sessionId = null) {
    let latest = await this.getLatestAnalysis(company);
    let matchedCompany = company;
    let hasRecord = false;
    let isIncomplete = false;

    if (latest) {
      hasRecord = true;

      // 1. Detect material events
      const eventCheck = await materialEventService.detectMaterialEvents(company, latest.createdAt);
      if (eventCheck.hasMaterialEvent) {
        console.log(`[Cache Service] Material event detected for "${company}" since ${latest.createdAt}. Triggering EVENT_REFRESH.`);
        const fresh = await executeWorkflow(company, null, eventCheck);
        const formattedFresh = await analysisService.getAnalysisById(fresh.analysisId);
        this.cacheMisses++;
        return {
          analysisId: fresh.analysisId,
          company: fresh.company,
          dataSource: "EVENT_REFRESH",
          cacheReason: "material_event_detected",
          generatedAt: fresh.createdAt || new Date(),
          ageHours: 0,
          freshnessScore: formattedFresh.freshnessScore,
          evidenceAgeMinutes: formattedFresh.evidenceAgeMinutes,
          evidenceQualityScore: formattedFresh.evidenceQualityScore,
          dataQualityScore: formattedFresh.dataQualityScore,
          recommendationReasonCodes: formattedFresh.recommendationReasonCodes,
          analysis: {
            research: formattedFresh.research,
            scorecard: formattedFresh.scorecard,
            challenge: formattedFresh.challenge,
            finalDecision: formattedFresh.finalDecision
          }
        };
      }

      // 2. No material events. Check if cache is complete
      const isComplete = this.isAnalysisComplete(latest);
      if (isComplete) {
        console.log(`[Cache Service] Cache HIT for "${company}". No material events detected.`);
        this.cacheHits++;
        this.recordCacheHitExecution(sessionId);
        return {
          analysisId: latest.id,
          company: latest.company,
          dataSource: "CACHE",
          cacheReason: "no_material_change",
          generatedAt: latest.createdAt,
          ageHours: this.calculateAgeHours(latest.createdAt),
          freshnessScore: latest.freshnessScore,
          evidenceAgeMinutes: latest.evidenceAgeMinutes,
          evidenceQualityScore: latest.evidenceQualityScore,
          dataQualityScore: latest.dataQualityScore,
          recommendationReasonCodes: latest.recommendationReasonCodes,
          analysis: {
            research: latest.research,
            scorecard: latest.scorecard,
            challenge: latest.challenge,
            finalDecision: latest.finalDecision
          }
        };
      } else {
        isIncomplete = true;
      }
    }

    let resolvedCompanyData = null;
    try {
      const { default: companyResearchService } = await import('./companyResearchService.js');
      const companyResearch = await companyResearchService.getCompanyResearch(company);
      resolvedCompanyData = companyResearch;
      if (companyResearch && companyResearch.company && companyResearch.company.toLowerCase() !== company.toLowerCase()) {
        console.log(`[Cache Service] Normalizing query "${company}" to official name "${companyResearch.company}"`);
        matchedCompany = companyResearch.company;
        
        let normalizedLatest = await this.getLatestAnalysis(matchedCompany);
        if (normalizedLatest) {
          hasRecord = true;

          // Detect material events for normalized name
          const eventCheck = await materialEventService.detectMaterialEvents(matchedCompany, normalizedLatest.createdAt);
          if (eventCheck.hasMaterialEvent) {
            console.log(`[Cache Service] Material event detected for normalized "${matchedCompany}" since ${normalizedLatest.createdAt}. Triggering EVENT_REFRESH.`);
            const fresh = await executeWorkflow(matchedCompany, resolvedCompanyData, eventCheck);
            const formattedFresh = await analysisService.getAnalysisById(fresh.analysisId);
            this.cacheMisses++;
            return {
              analysisId: fresh.analysisId,
              company: fresh.company,
              dataSource: "EVENT_REFRESH",
              cacheReason: "material_event_detected",
              generatedAt: fresh.createdAt || new Date(),
              ageHours: 0,
              freshnessScore: formattedFresh.freshnessScore,
              evidenceAgeMinutes: formattedFresh.evidenceAgeMinutes,
              evidenceQualityScore: formattedFresh.evidenceQualityScore,
              dataQualityScore: formattedFresh.dataQualityScore,
              recommendationReasonCodes: formattedFresh.recommendationReasonCodes,
              analysis: {
                research: formattedFresh.research,
                scorecard: formattedFresh.scorecard,
                challenge: formattedFresh.challenge,
                finalDecision: formattedFresh.finalDecision
              }
            };
          }

          const isComplete = this.isAnalysisComplete(normalizedLatest);
          if (isComplete) {
            console.log(`[Cache Service] Cache HIT for normalized name "${matchedCompany}".`);
            this.cacheHits++;
            this.recordCacheHitExecution(sessionId);
            return {
              analysisId: normalizedLatest.id,
              company: normalizedLatest.company,
              dataSource: "CACHE",
              cacheReason: "no_material_change",
              generatedAt: normalizedLatest.createdAt,
              ageHours: this.calculateAgeHours(normalizedLatest.createdAt),
              freshnessScore: normalizedLatest.freshnessScore,
              evidenceAgeMinutes: normalizedLatest.evidenceAgeMinutes,
              evidenceQualityScore: normalizedLatest.evidenceQualityScore,
              dataQualityScore: normalizedLatest.dataQualityScore,
              recommendationReasonCodes: normalizedLatest.recommendationReasonCodes,
              analysis: {
                research: normalizedLatest.research,
                scorecard: normalizedLatest.scorecard,
                challenge: normalizedLatest.challenge,
                finalDecision: normalizedLatest.finalDecision
              }
            };
          } else {
            isIncomplete = true;
          }
        }
      }
    } catch (err) {
      console.warn(`[Cache Service] Could not resolve official name for "${company}":`, err.message);
    }

    if (hasRecord && isIncomplete) {
      console.log(`[Cache Service] Cache REPAIR for "${matchedCompany}". Incomplete scorecard. Auto-repairing...`);
      const fresh = await executeWorkflow(matchedCompany, resolvedCompanyData);
      const formattedFresh = await analysisService.getAnalysisById(fresh.analysisId);
      this.cacheRepairs++;
      return {
        analysisId: fresh.analysisId,
        company: fresh.company,
        dataSource: "CACHE_REPAIRED",
        cacheReason: "incomplete_cache",
        generatedAt: fresh.createdAt || new Date(),
        ageHours: 0,
        freshnessScore: formattedFresh.freshnessScore,
        evidenceAgeMinutes: formattedFresh.evidenceAgeMinutes,
        evidenceQualityScore: formattedFresh.evidenceQualityScore,
        dataQualityScore: formattedFresh.dataQualityScore,
        recommendationReasonCodes: formattedFresh.recommendationReasonCodes,
        analysis: {
          research: formattedFresh.research,
          scorecard: formattedFresh.scorecard,
          challenge: formattedFresh.challenge,
          finalDecision: formattedFresh.finalDecision
        }
      };
    }

    console.log(`[Cache Service] Cache MISS/STALE for "${matchedCompany}". Generating fresh analysis...`);
    const fresh = await executeWorkflow(matchedCompany, resolvedCompanyData);
    const formattedFresh = await analysisService.getAnalysisById(fresh.analysisId);
    this.cacheMisses++;
    return {
      analysisId: fresh.analysisId,
      company: fresh.company,
      dataSource: "FRESH_ANALYSIS",
      cacheReason: "stale_cache",
      generatedAt: fresh.createdAt || new Date(),
      ageHours: 0,
      freshnessScore: formattedFresh.freshnessScore,
      evidenceAgeMinutes: formattedFresh.evidenceAgeMinutes,
      evidenceQualityScore: formattedFresh.evidenceQualityScore,
      dataQualityScore: formattedFresh.dataQualityScore,
      recommendationReasonCodes: formattedFresh.recommendationReasonCodes,
      analysis: {
        research: formattedFresh.research,
        scorecard: formattedFresh.scorecard,
        challenge: formattedFresh.challenge,
        finalDecision: formattedFresh.finalDecision
      }
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
  async getAnalysisForComparison(company, executeWorkflow, sessionId = null) {
    let latest = await this.getLatestAnalysis(company);
    let matchedCompany = company;
    let hasRecord = false;
    let isIncomplete = false;

    if (latest) {
      hasRecord = true;

      // 1. Detect material events
      const eventCheck = await materialEventService.detectMaterialEvents(company, latest.createdAt);
      if (eventCheck.hasMaterialEvent) {
        console.log(`[Cache Service] Comparison query: Material event detected for "${company}". Refreshing cache...`);
        const fresh = await executeWorkflow(company, null, eventCheck);
        return await analysisService.getAnalysisById(fresh.analysisId);
      }

      const isComplete = this.isAnalysisComplete(latest);
      if (isComplete) {
        console.log(`[Cache Service] Comparison query: Cache HIT for "${company}".`);
        this.cacheHits++;
        this.recordCacheHitExecution(sessionId);
        return latest;
      } else {
        isIncomplete = true;
      }
    }

    let resolvedCompanyData = null;
    try {
      const { default: companyResearchService } = await import('./companyResearchService.js');
      const companyResearch = await companyResearchService.getCompanyResearch(company);
      resolvedCompanyData = companyResearch;
      if (companyResearch && companyResearch.company && companyResearch.company.toLowerCase() !== company.toLowerCase()) {
        matchedCompany = companyResearch.company;
        let normalizedLatest = await this.getLatestAnalysis(matchedCompany);
        if (normalizedLatest) {
          hasRecord = true;

          // Detect material events for normalized name
          const eventCheck = await materialEventService.detectMaterialEvents(matchedCompany, normalizedLatest.createdAt);
          if (eventCheck.hasMaterialEvent) {
            console.log(`[Cache Service] Comparison query: Material event detected for normalized "${matchedCompany}". Refreshing cache...`);
            const fresh = await executeWorkflow(matchedCompany, resolvedCompanyData, eventCheck);
            return await analysisService.getAnalysisById(fresh.analysisId);
          }

          const isComplete = this.isAnalysisComplete(normalizedLatest);
          if (isComplete) {
            console.log(`[Cache Service] Comparison query: Cache HIT for normalized name "${matchedCompany}".`);
            this.cacheHits++;
            this.recordCacheHitExecution(sessionId);
            return normalizedLatest;
          } else {
            isIncomplete = true;
          }
        }
      }
    } catch (err) {
      console.warn(`[Cache Service] Comparison: name resolution failed for "${company}":`, err.message);
    }

    if (hasRecord && isIncomplete) {
      console.log(`[Cache Service] Comparison query: Cache REPAIR for "${matchedCompany}". Auto-repairing...`);
      const fresh = await executeWorkflow(matchedCompany, resolvedCompanyData);
      this.cacheRepairs++;
      return await analysisService.getAnalysisById(fresh.analysisId);
    }

    console.log(`[Cache Service] Comparison query: Cache MISS/STALE for "${matchedCompany}". Generating...`);
    const fresh = await executeWorkflow(matchedCompany, resolvedCompanyData);
    this.cacheMisses++;
    return await analysisService.getAnalysisById(fresh.analysisId);
  }

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

      const totalRequests = this.cacheHits + this.cacheMisses + this.cacheRepairs;
      const hitRatio = totalRequests > 0 ? (this.cacheHits / totalRequests) : 0;
      const cacheHitRate = `${parseFloat((hitRatio * 100).toFixed(2))}%`;

      return {
        totalAnalyses,
        freshAnalyses,
        staleAnalyses,
        totalRequests,
        cacheHits: this.cacheHits,
        cacheMisses: this.cacheMisses,
        cacheRepairs: this.cacheRepairs,
        cacheHitRate
      };
    } catch (error) {
      console.error("[Cache Service] Failed to retrieve cache stats:", error.message);
      throw error;
    }
  }


}

export default new CacheService();
