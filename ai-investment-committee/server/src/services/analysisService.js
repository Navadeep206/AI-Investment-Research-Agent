import prisma from '../config/prisma.js';

class AnalysisService {
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
          finalDecision: data.finalDecision
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
      return await prisma.analysis.findMany({
        orderBy: {
          createdAt: 'desc'
        }
      });
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
      return await prisma.analysis.findUnique({
        where: { id }
      });
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
      return await prisma.analysis.findFirst({
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
    } catch (error) {
      console.error(`[Analysis Service] Error querying latest analysis for "${company}":`, error.message);
      throw error;
    }
  }
}

export default new AnalysisService();
