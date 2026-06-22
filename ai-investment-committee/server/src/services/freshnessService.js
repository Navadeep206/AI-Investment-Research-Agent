class FreshnessService {
  /**
   * Calculates evidence age, status, and freshness score relative to the creation date of the analysis.
   * 
   * @param {Date|string} createdAt Creation timestamp of the analysis
   * @returns {Object} { evidenceAgeMinutes, freshnessScore, status }
   */
  calculateFreshness(createdAt) {
    if (!createdAt) {
      return {
        evidenceAgeMinutes: 0,
        freshnessScore: 100,
        status: 'LIVE'
      };
    }

    const diffMs = Date.now() - new Date(createdAt).getTime();
    const ageMinutes = Math.max(0, parseFloat((diffMs / 60000).toFixed(2)));

    let status = 'LIVE';
    let freshnessScore = 100;

    // Freshness status categorization
    if (ageMinutes < 15) {
      status = 'LIVE';
      freshnessScore = 100;
    } else if (ageMinutes < 60) {
      status = 'FRESH';
      // Decays 100 to 90 over 45 minutes
      freshnessScore = Math.round(100 - (ageMinutes - 15) * (10 / 45));
    } else if (ageMinutes < 1440) {
      status = 'RECENT';
      // Decays 90 to 60 over 1380 minutes (23 hours)
      freshnessScore = Math.round(90 - (ageMinutes - 60) * (30 / 1380));
    } else {
      status = 'STALE';
      // Decays 60 to 0 over 1440 minutes (24 hours), then holds at 0
      freshnessScore = Math.max(0, Math.round(60 - (ageMinutes - 1440) * (60 / 1440)));
    }

    return {
      evidenceAgeMinutes: ageMinutes,
      freshnessScore,
      status
    };
  }
}

export default new FreshnessService();
