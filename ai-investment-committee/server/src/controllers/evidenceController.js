import evidenceService from '../services/evidenceService.js';
import sourceRankingService from '../services/sourceRankingService.js';

/**
 * Endpoint controller to collect evidence for a given company.
 * POST /api/evidence
 */
export const getEvidenceForCompany = async (req, res, next) => {
  try {
    const { company } = req.body;

    // Validate query parameter
    if (!company || typeof company !== 'string' || !company.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body. "company" name parameter is required.'
      });
    }

    const companyQueryName = company.trim();
    console.log(`[Evidence Controller] Request received for evidence collection: "${companyQueryName}"`);

    try {
      const rawEvidence = await evidenceService.collectEvidence(companyQueryName);
      const { rankedEvidence, metrics } = sourceRankingService.rankEvidence(rawEvidence);
      
      return res.status(200).json({
        success: true,
        company: companyQueryName,
        evidence: rankedEvidence,
        evidenceMetrics: metrics
      });
    } catch (serviceErr) {
      console.error(`[Evidence Controller] Failed to retrieve evidence:`, serviceErr.message);
      return res.status(502).json({
        success: false,
        message: `Failed to collect web search evidence for "${companyQueryName}": ${serviceErr.message}`
      });
    }
  } catch (error) {
    console.error('[Evidence Controller] Unexpected error:', error.stack);
    next(error);
  }
};
