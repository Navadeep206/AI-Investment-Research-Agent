/**
 * Service to rank evidence sources based on their credibility tier.
 */
class SourceRankingService {
  /**
   * Classifies a source name or URL into credibility Tiers A, B, C, or D.
   * 
   * @param {string} sourceName Name of the source
   * @param {string} url Source URL
   * @returns {Object} Tier name and numeric credibility weight
   */
  classifySource(sourceName, url = "") {
    const src = (sourceName || "").toLowerCase().trim();
    const link = (url || "").toLowerCase().trim();

    // Tier A (Highest)
    if (
      src.includes("reuters") || link.includes("reuters.com") ||
      src.includes("bloomberg") || link.includes("bloomberg.com") ||
      src.includes("sec") || link.includes("sec.gov") ||
      src.includes("yahoo finance") || src.includes("yahoofinance") || link.includes("finance.yahoo") ||
      src.includes("nasdaq") || link.includes("nasdaq.com") ||
      src.includes("wall street journal") || src.includes("wsj") || link.includes("wsj.com") ||
      src.includes("financial times") || src.includes("ft.com")
    ) {
      return { tier: "Tier A", weight: 1.0 };
    }

    // Tier B
    if (
      src.includes("marketwatch") || src.includes("market watch") || link.includes("marketwatch.com") ||
      src.includes("cnbc") || link.includes("cnbc.com") ||
      src.includes("morningstar") || link.includes("morningstar.com") ||
      src.includes("seeking alpha") || src.includes("seekingalpha") || link.includes("seekingalpha.com") ||
      src.includes("cmc markets") || src.includes("cmcmarkets") || link.includes("cmcmarkets.com")
    ) {
      return { tier: "Tier B", weight: 0.8 };
    }

    // Tier D (Low credibility checked before generic blogs to ensure accuracy)
    if (
      src.includes("youtube") || src.includes("youtu.be") || link.includes("youtube.com") || link.includes("youtu.be") ||
      src.includes("twitter") || src.includes("x.com") || link.includes("twitter.com") || link.includes("x.com") ||
      src === "x" ||
      src.includes("reddit") || link.includes("reddit.com") ||
      src.includes("facebook") || link.includes("facebook.com") ||
      src.includes("instagram") || link.includes("instagram.com") ||
      src.includes("forum") || src.includes("fora") ||
      src.includes("discord") || link.includes("discord.gg")
    ) {
      return { tier: "Tier D", weight: 0.3 };
    }

    // Tier C (Medium)
    if (
      src.includes("blog") || src.includes("newsroom") || src.includes("medium") || link.includes("medium.com") ||
      src.includes("independent") || src.includes("press release") || src.includes("pr newswire") || src.includes("prnewswire")
    ) {
      return { tier: "Tier C", weight: 0.5 };
    }

    // Fallback default is Tier C
    return { tier: "Tier C", weight: 0.5 };
  }

  /**
   * Processes a list of raw evidence objects and returns ranked evidence and aggregate metrics.
   * 
   * @param {Array} evidenceList List of evidence items
   * @returns {Object} { rankedEvidence, metrics }
   */
  rankEvidence(evidenceList) {
    if (!Array.isArray(evidenceList) || evidenceList.length === 0) {
      return {
        rankedEvidence: [],
        metrics: {
          totalSources: 0,
          tierA: 0,
          tierB: 0,
          tierC: 0,
          tierD: 0,
          averageConfidence: 0,
          evidenceQualityScore: 0
        }
      };
    }

    let tierACount = 0;
    let tierBCount = 0;
    let tierCCount = 0;
    let tierDCount = 0;
    let sumConfidence = 0;
    let sumWeightedConfidence = 0;

    const ranked = evidenceList.map((item) => {
      const { tier, weight } = this.classifySource(item.source, item.url);
      const weightedConfidence = Math.round(item.confidence * weight);

      if (tier === "Tier A") tierACount++;
      else if (tier === "Tier B") tierBCount++;
      else if (tier === "Tier C") tierCCount++;
      else if (tier === "Tier D") tierDCount++;

      sumConfidence += item.confidence;
      sumWeightedConfidence += weightedConfidence;

      return {
        claim: item.claim,
        source: item.source,
        url: item.url,
        confidence: item.confidence,
        tier,
        credibilityWeight: weight,
        weightedConfidence
      };
    });

    // Sort evidence by: weightedConfidence DESC
    ranked.sort((a, b) => b.weightedConfidence - a.weightedConfidence);

    const totalSources = evidenceList.length;
    const averageConfidence = Math.round(sumConfidence / totalSources);
    const evidenceQualityScore = Math.round(sumWeightedConfidence / totalSources);

    const metrics = {
      totalSources,
      tierA: tierACount,
      tierB: tierBCount,
      tierC: tierCCount,
      tierD: tierDCount,
      averageConfidence,
      evidenceQualityScore
    };

    return {
      rankedEvidence: ranked,
      metrics
    };
  }
}

export default new SourceRankingService();
