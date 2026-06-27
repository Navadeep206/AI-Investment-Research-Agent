import prisma from '../config/prisma.js';

class CacheService {
  constructor() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.cacheRepairs = 0; // Kept for compatibility, though self-healing isn't used
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
   * Finds cached evidence by company name case-insensitively or by ticker symbol.
   * 
   * @param {string} query Search company name or ticker
   * @returns {Promise<Object|null>} Cached record or null
   */
  async findCachedEvidenceRecord(query) {
    const trimmed = (query || "").trim();
    if (!trimmed) return null;

    // 1. Exact or contains lookup on companyName
    let cached = await prisma.evidenceCache.findFirst({
      where: {
        OR: [
          {
            companyName: {
              equals: trimmed,
              mode: 'insensitive'
            }
          },
          {
            companyName: {
              contains: trimmed,
              mode: 'insensitive'
            }
          }
        ]
      }
    });

    if (cached) return cached;

    // 2. Lookup by symbol inside the normalizedEvidence JSON
    cached = await prisma.evidenceCache.findFirst({
      where: {
        normalizedEvidence: {
          path: ['companyData', 'symbol'],
          equals: trimmed.toUpperCase()
        }
      }
    });

    return cached;
  }

  /**
   * Main lookup method. Returns cached evidence if valid, otherwise returns null.
   * 
   * @param {string} company Search company name or ticker
   * @param {boolean} forceRefresh User forced refresh
   * @returns {Promise<Object|null>} Cached evidence data or null
   */
  async getEvidence(company, forceRefresh = false) {
    const trimmedCompany = (company || "").trim();
    if (!trimmedCompany) return null;

    if (forceRefresh) {
      console.log(`[Cache Service] Force refresh requested for "${trimmedCompany}". Invalidating cache.`);
      this.cacheMisses++;
      // Delete existing cache entry to invalidate it completely
      try {
        const existing = await this.findCachedEvidenceRecord(trimmedCompany);
        if (existing) {
          await prisma.evidenceCache.delete({ where: { id: existing.id } });
        }
      } catch (err) {
        console.warn(`[Cache Service] Error invalidating cache:`, err.message);
      }
      return null;
    }

    const cached = await this.findCachedEvidenceRecord(trimmedCompany);

    if (cached) {
      const isFresh = new Date(cached.expiresAt) > new Date();
      if (isFresh) {
        console.log(`[Cache Service] Cache HIT for "${trimmedCompany}".`);
        this.cacheHits++;
        return {
          companyName: cached.companyName,
          normalizedEvidence: cached.normalizedEvidence,
          sources: cached.sources,
          retrievedAt: cached.retrievedAt,
          ageHours: this.calculateAgeHours(cached.retrievedAt)
        };
      } else {
        console.log(`[Cache Service] Cache EXPIRED for "${trimmedCompany}". Invalidating.`);
        this.cacheMisses++;
        try {
          await prisma.evidenceCache.delete({ where: { id: cached.id } });
        } catch (err) {
          console.warn(`[Cache Service] Error deleting expired cache entry:`, err.message);
        }
        return null;
      }
    }

    console.log(`[Cache Service] Cache MISS for "${trimmedCompany}".`);
    this.cacheMisses++;
    return null;
  }

  /**
   * Saves normalized evidence and metadata to database.
   * 
   * @param {string} companyName Official normalized company name
   * @param {Object} evidencePayload Contains companyData, evidence (ranked list), evidenceMetrics
   */
  async saveEvidenceToCache(companyName, evidencePayload) {
    if (!companyName || !evidencePayload) return;

    const ttlMs = 24 * 60 * 60 * 1000; // 24 hours TTL
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    // Build list of unique sources
    const sourcesSet = new Set(["Wikipedia", "Yahoo Finance"]);
    if (Array.isArray(evidencePayload.evidence)) {
      evidencePayload.evidence.forEach(e => {
        if (e.source) sourcesSet.add(e.source);
      });
    }
    const sources = Array.from(sourcesSet);

    console.log(`[Cache Service] Saving evidence cache for "${companyName}". Sources: ${sources.join(', ')}`);

    try {
      await prisma.evidenceCache.upsert({
        where: { companyName },
        update: {
          normalizedEvidence: evidencePayload,
          sources: sources,
          retrievedAt: now,
          expiresAt: expiresAt
        },
        create: {
          companyName,
          normalizedEvidence: evidencePayload,
          sources: sources,
          retrievedAt: now,
          expiresAt: expiresAt
        }
      });
    } catch (err) {
      console.error(`[Cache Service] Error upserting evidence cache for "${companyName}":`, err.message);
      throw err;
    }
  }

  /**
   * Replaces getOrRefreshAnalysis to satisfy existing integration test verifyFinalBackend.js.
   * Since verifyFinalBackend.js expects getOrRefreshAnalysis, we implement it here but under the hood
   * it executes the workflow and returns the response in the format it expects, without caching the final analysis.
   */
  async getOrRefreshAnalysis(company, executeWorkflow, sessionId = null, forceRefresh = false) {
    console.log(`[Cache Service] getOrRefreshAnalysis called for "${company}" (forceRefresh: ${forceRefresh}).`);
    
    // Read from evidence cache first
    const cachedEvidence = await this.getEvidence(company, forceRefresh);
    
    let result;
    let dataSource;
    let cacheReason;
    if (cachedEvidence) {
      result = await executeWorkflow(cachedEvidence.companyName, cachedEvidence.normalizedEvidence);
      dataSource = "CACHE";
      cacheReason = "fresh_cache";
    } else {
      result = await executeWorkflow(company, null);
      dataSource = "FRESH_ANALYSIS";
      cacheReason = "stale_cache";
    }

    const { default: analysisService } = await import('./analysisService.js');
    const formatted = await analysisService.getAnalysisById(result.analysisId);

    return {
      analysisId: formatted.id,
      company: formatted.company,
      dataSource,
      cacheReason,
      generatedAt: formatted.createdAt,
      ageHours: cachedEvidence ? cachedEvidence.ageHours : 0,
      freshnessScore: formatted.freshnessScore,
      evidenceAgeMinutes: formatted.evidenceAgeMinutes,
      evidenceQualityScore: formatted.evidenceQualityScore,
      dataQualityScore: formatted.dataQualityScore,
      recommendationReasonCodes: formatted.recommendationReasonCodes,
      analysis: {
        research: formatted.research,
        scorecard: formatted.scorecard,
        challenge: formatted.challenge,
        finalDecision: formatted.finalDecision
      }
    };
  }

  /**
   * Replaces getAnalysisForComparison to satisfy comparison and portfolio constituent loading.
   */
  async getAnalysisForComparison(company, executeWorkflow, sessionId = null) {
    console.log(`[Cache Service] getAnalysisForComparison called for "${company}".`);
    const cachedEvidence = await this.getEvidence(company, false);
    
    let result;
    if (cachedEvidence) {
      result = await executeWorkflow(cachedEvidence.companyName, cachedEvidence.normalizedEvidence);
    } else {
      result = await executeWorkflow(company, null);
    }

    // Return the actual saved analysis record (Prisma Analysis model)
    const { default: analysisService } = await import('./analysisService.js');
    return await analysisService.getAnalysisById(result.analysisId);
  }

  /**
   * Retrieves cache statistics.
   */
  async getCacheStats() {
    try {
      const totalRequests = this.cacheHits + this.cacheMisses;
      const hitRatio = totalRequests > 0 ? (this.cacheHits / totalRequests) : 0;
      const cacheHitRate = `${parseFloat((hitRatio * 100).toFixed(2))}%`;

      const totalCached = await prisma.evidenceCache.count();
      const freshCached = await prisma.evidenceCache.count({
        where: {
          expiresAt: {
            gt: new Date()
          }
        }
      });
      const staleCached = totalCached - freshCached;

      return {
        totalAnalyses: totalCached, // kept name same to avoid UI telemetry breakages
        freshAnalyses: freshCached,
        staleAnalyses: staleCached,
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
