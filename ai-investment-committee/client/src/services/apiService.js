import api from '../api/axios';

/**
 * Service class for interacting with the backend AI Investment Committee endpoints.
 */
class ApiService {
  /**
   * Retrieves the full analysis history.
   * GET /api/history
   */
  async getHistory() {
    try {
      const response = await api.get('/history');
      return response.history || [];
    } catch (error) {
      console.error('[ApiService] Failed to get analysis history:', error);
      throw error;
    }
  }

  /**
   * Retrieves a single analysis by its CUID.
   * GET /api/history/:id
   */
  async getAnalysis(id) {
    try {
      const response = await api.get(`/history/${id}`);
      return response.analysis || null;
    } catch (error) {
      console.error(`[ApiService] Failed to get analysis details for ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Deletes an analysis record.
   * DELETE /api/history/:id
   */
  async deleteAnalysis(id) {
    try {
      const response = await api.delete(`/history/${id}`);
      return response;
    } catch (error) {
      console.error(`[ApiService] Failed to delete analysis ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Triggers the full LangGraph multi-agent analysis for a company.
   * POST /api/analyze
   */
  async analyzeCompany(companyName, sessionId = null) {
    try {
      const response = await api.post('/analyze', { company: companyName, sessionId });
      return response; // Contains success, analysisId, company, dataSource, ageHours, analysis
    } catch (error) {
      console.error(`[ApiService] Failed to analyze company "${companyName}":`, error);
      throw error;
    }
  }

  /**
   * Retrieves real-time multi-agent execution state for a session.
   * GET /api/execution/:sessionId
   */
  async getExecutionState(sessionId) {
    try {
      const response = await api.get(`/execution/${sessionId}`);
      return response; // Contains agents array
    } catch (error) {
      console.error(`[ApiService] Failed to get execution state for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Compares two companies side by side.
   * POST /api/compare
   */
  async compareCompanies(companyA, companyB) {
    try {
      const response = await api.post('/compare', { companyA, companyB });
      return response; // Contains success, companyA, companyB, dataQuality, comparison
    } catch (error) {
      console.error(`[ApiService] Failed to compare "${companyA}" and "${companyB}":`, error);
      throw error;
    }
  }

  /**
   * Analyzes a constructed portfolio of holdings.
   * POST /api/portfolio/analyze
   */
  async analyzePortfolio(holdings) {
    try {
      const response = await api.post('/portfolio/analyze', { holdings });
      return response;
    } catch (error) {
      console.error('[ApiService] Failed to analyze portfolio:', error);
      throw error;
    }
  }

  /**
   * Downloads the generated PDF report for a given analysis ID.
   * GET /api/report/:id
   */
  async downloadAnalysisPDF(id) {
    try {
      const response = await api.get(`/report/${id}`, {
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error(`[ApiService] Failed to fetch PDF report for analysis ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Downloads the generated PDF comparison report for two companies.
   * GET /api/report/compare
   */
  async downloadComparisonPDF(companyA, companyB) {
    try {
      const response = await api.get('/report/compare', {
        params: { companyA, companyB },
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error(`[ApiService] Failed to fetch PDF comparison report for "${companyA}" vs "${companyB}":`, error);
      throw error;
    }
  }

  /**
   * Downloads the generated PDF portfolio report for holdings.
   * GET /api/report/portfolio
   */
  async downloadPortfolioPDF(holdings) {
    try {
      const response = await api.get('/report/portfolio', {
        params: { holdings: JSON.stringify(holdings) },
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('[ApiService] Failed to fetch PDF portfolio report:', error);
      throw error;
    }
  }

  /**
   * Gets cache statistics.
   * GET /api/cache-stats
   */
  async getCacheStats() {
    try {
      const response = await api.get('/cache-stats');
      return response.stats || {};
    } catch (error) {
      console.error('[ApiService] Failed to fetch cache statistics:', error);
      return {
        totalAnalyses: 0,
        cacheHitRate: '0%',
        cacheHits: 0,
        cacheMisses: 0,
        cacheRepairs: 0
      };
    }
  }

  /**
   * Combines database history and cache stats to compute dashboard telemetry data.
   */
  async getDashboardStats() {
    try {
      const [history, cacheStats] = await Promise.all([
        this.getHistory(),
        this.getCacheStats()
      ]);

      // Calculate unique companies tracked
      const uniqueCompanies = new Set(history.map(item => item.company.toLowerCase()));

      // Calculate confidence averages
      const validConfidenceScores = history.filter(item => typeof item.confidence === 'number');
      const avgConfidence = validConfidenceScores.length > 0
        ? Math.round(validConfidenceScores.reduce((sum, item) => sum + item.confidence, 0) / validConfidenceScores.length)
        : 0;

      // Calculate evidence quality averages
      const validEvidenceScores = history.filter(item => typeof item.evidenceQualityScore === 'number');
      const avgEvidenceQuality = validEvidenceScores.length > 0
        ? Math.round(validEvidenceScores.reduce((sum, item) => sum + item.evidenceQualityScore, 0) / validEvidenceScores.length)
        : 0;

      // Calculate recommendation splits
      const distribution = { INVEST: 0, WATCH: 0, PASS: 0 };
      history.forEach(item => {
        const rec = (item.recommendation || '').toUpperCase();
        if (rec === 'INVEST') distribution.INVEST++;
        else if (rec === 'WATCH') distribution.WATCH++;
        else if (rec === 'PASS') distribution.PASS++;
      });

      // Filter Top Rated Companies (score >= 80, sorted descending)
      const topRated = [...history]
        .filter(item => typeof item.overallScore === 'number' && item.overallScore >= 80)
        .sort((a, b) => b.overallScore - a.overallScore);

      return {
        totalAnalyses: history.length,
        companiesTracked: uniqueCompanies.size,
        cacheHitRate: cacheStats.cacheHitRate || '0%',
        avgConfidence,
        avgEvidenceQuality,
        recentAnalyses: history.slice(0, 10),
        topRatedCompanies: topRated.slice(0, 10),
        recommendationDistribution: [
          { name: 'INVEST', value: distribution.INVEST, color: '#10B981' },
          { name: 'WATCH', value: distribution.WATCH, color: '#F59E0B' },
          { name: 'PASS', value: distribution.PASS, color: '#EF4444' }
        ],
        rawHistory: history,
        cacheStats
      };
    } catch (error) {
      console.error('[ApiService] Failed to assemble dashboard statistics:', error);
      return {
        totalAnalyses: 0,
        companiesTracked: 0,
        cacheHitRate: '0%',
        avgConfidence: 0,
        avgEvidenceQuality: 0,
        recentAnalyses: [],
        topRatedCompanies: [],
        recommendationDistribution: [
          { name: 'INVEST', value: 0, color: '#10B981' },
          { name: 'WATCH', value: 0, color: '#F59E0B' },
          { name: 'PASS', value: 0, color: '#EF4444' }
        ],
        rawHistory: []
      };
    }
  }
}

export default new ApiService();
