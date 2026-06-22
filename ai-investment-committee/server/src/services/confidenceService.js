class ConfidenceService {
  /**
   * Calculates the calibrated confidence based on evidence quality, data quality, and agent agreement.
   * Formula: confidence = 0.4 * evidenceQuality + 0.3 * dataQuality + 0.3 * agentAgreement
   * Clamped to 0 - 100.
   * 
   * @param {number} evidenceQualityScore Evidence quality metric (0 - 100)
   * @param {number} dataQualityScore Data quality metric (0 - 100)
   * @param {number} agentAgreementScore Agent consensus score (0 - 100)
   * @returns {Object} The calculated confidence score and its breakdown
   */
  calculateConfidence(evidenceQualityScore, dataQualityScore, agentAgreementScore) {
    const eq = Math.max(0, Math.min(100, evidenceQualityScore || 0));
    const dq = Math.max(0, Math.min(100, dataQualityScore || 0));
    const aa = Math.max(0, Math.min(100, agentAgreementScore || 0));

    // Calculate confidence (floored to match example 88.5 -> 88)
    const confidence = Math.floor(0.4 * eq + 0.3 * dq + 0.3 * aa);
    const clamped = Math.max(0, Math.min(100, confidence));

    return {
      confidence: clamped,
      confidenceBreakdown: {
        evidenceQuality: eq,
        dataQuality: dq,
        agentAgreement: aa
      }
    };
  }
}

export default new ConfidenceService();
