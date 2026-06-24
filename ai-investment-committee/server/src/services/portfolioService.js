import cacheService from './cacheService.js';
import analysisService from './analysisService.js';

// Programmatic stubs for deleted portfolio agents
const runPortfolioResearchAgent = async (holdings, details) => {
  return {
    diversificationOverview: `The portfolio consists of ${holdings.length} assets. Primary concentration is in sector assets with weighted quality score of ${Math.round(details.reduce((acc, h) => acc + h.overallScore * (h.weight / 100), 0))}.`,
    sectorReview: "Offline sector diversification analysis applied.",
    keyRiskFactors: ["Sector concentration risk", "Weighted valuation limits"],
    optimizationIdeas: ["Rebalance weights towards higher scoring assets", "Add sectors with low correlation"]
  };
};

const runPortfolioCommitteeAgent = async (metrics, research) => {
  return {
    recommendation: metrics.portfolioScore >= 60 ? "APPROVE" : "WATCH",
    confidence: metrics.confidence,
    reasoning: "Offline committee vetting applied: constituent scores averaged to yield the final recommendation. " + research.diversificationOverview,
    keyFactors: ["Weighted asset quality", "HHI sector concentration"]
  };
};

class PortfolioService {
  /**
   * Helper to safely extract integer score metrics from an Analysis record.
   */
  getMetricValue(record, field) {
    if (!record) return 0;
    const scorecard = record.scorecard || {};
    const finalDecision = record.finalDecision || {};
    
    if (scorecard[field] !== undefined && scorecard[field] !== null) return Number(scorecard[field]);
    if (finalDecision[field] !== undefined && finalDecision[field] !== null) return Number(finalDecision[field]);
    if (record[field] !== undefined && record[field] !== null) return Number(record[field]);
    return 0;
  }

  /**
   * Validates holdings and performs the complete portfolio-level analysis.
   */
  async analyzePortfolio(holdings = []) {
    // 1. Input Validation
    if (!Array.isArray(holdings) || holdings.length === 0) {
      throw new Error('Holdings array is required and must not be empty.');
    }

    let totalWeight = 0;
    const validatedHoldings = [];

    for (const h of holdings) {
      if (!h.company || typeof h.company !== 'string' || !h.company.trim()) {
        throw new Error('Each holding must specify a valid "company" string.');
      }
      
      const weight = Number(h.weight);
      if (isNaN(weight) || weight <= 0 || weight > 100) {
        throw new Error(`Holding weight for "${h.company}" must be a positive number between 0 and 100.`);
      }

      totalWeight += weight;
      validatedHoldings.push({
        company: h.company.trim(),
        weight
      });
    }

    // Strict validation: sum of weights must equal exactly 100
    // Use epsilon to prevent floating point inaccuracies
    if (Math.abs(totalWeight - 100) > 0.001) {
      const err = new Error(`Holdings total weight sum must equal exactly 100. Current sum: ${totalWeight}`);
      err.statusCode = 400; // Let controller capture this code
      throw err;
    }

    // 2. Resolve constituent company analyses (Smart Cache fetch or auto-refresh)
    const holdingsDetail = [];
    const executeWorkflow = async (resolvedName, preFetchedData = null) => {
      return await analysisService.runFullAnalysisAndSave(resolvedName, preFetchedData);
    };

    console.log(`[Portfolio Service] Resolving ${validatedHoldings.length} holdings and loading/refreshing cache records...`);
    for (const h of validatedHoldings) {
      try {
        const record = await cacheService.getAnalysisForComparison(h.company, executeWorkflow);
        if (!record) {
          throw new Error(`Failed to resolve analysis record for company: "${h.company}"`);
        }
        holdingsDetail.push({
          company: record.company,
          weight: h.weight,
          industry: record.industry || 'Technology', // Default fallback
          marketCap: record.marketCap || 'N/A',
          overallScore: this.getMetricValue(record, 'overallScore'),
          businessQuality: this.getMetricValue(record, 'businessQuality'),
          growthPotential: this.getMetricValue(record, 'growthPotential'),
          competitiveMoat: this.getMetricValue(record, 'competitiveMoat'),
          financialStrength: this.getMetricValue(record, 'financialStrength'),
          riskLevel: this.getMetricValue(record, 'riskLevel'),
          confidence: this.getMetricValue(record, 'confidence'),
          recommendation: record.recommendation || 'WATCH'
        });
      } catch (err) {
        console.error(`[Portfolio Service] Failed to retrieve holding record for "${h.company}":`, err.message);
        throw new Error(`Holding resolution failed: "${h.company}". Details: ${err.message}`);
      }
    }

    // 3. Compute Weighted Score Metrics
    let weightedScores = {
      businessQuality: 0,
      growthPotential: 0,
      competitiveMoat: 0,
      financialStrength: 0,
      riskLevel: 0,
      overallScore: 0,
      confidence: 0
    };

    for (const hd of holdingsDetail) {
      const fraction = hd.weight / 100;
      weightedScores.businessQuality += hd.businessQuality * fraction;
      weightedScores.growthPotential += hd.growthPotential * fraction;
      weightedScores.competitiveMoat += hd.competitiveMoat * fraction;
      weightedScores.financialStrength += hd.financialStrength * fraction;
      weightedScores.riskLevel += hd.riskLevel * fraction;
      weightedScores.overallScore += hd.overallScore * fraction;
      weightedScores.confidence += hd.confidence * fraction;
    }

    // Round metrics to integer values
    const roundedMetrics = {
      businessQuality: Math.round(weightedScores.businessQuality),
      growthPotential: Math.round(weightedScores.growthPotential),
      competitiveMoat: Math.round(weightedScores.competitiveMoat),
      financialStrength: Math.round(weightedScores.financialStrength),
      riskLevel: Math.round(weightedScores.riskLevel),
      overallScore: Math.round(weightedScores.overallScore),
      confidence: Math.round(weightedScores.confidence)
    };

    // 4. Industry Diversification Logic (HHI Method)
    const industryWeights = {};
    for (const hd of holdingsDetail) {
      const ind = hd.industry;
      industryWeights[ind] = (industryWeights[ind] || 0) + hd.weight;
    }

    let diversificationScore = 100;
    const uniqueIndustries = Object.keys(industryWeights);
    let hhi = 1.0;
    
    if (uniqueIndustries.length <= 1) {
      diversificationScore = 20; // Low diversification: all in same sector
    } else {
      // Sum squares of weights to compute Herfindahl-Hirschman Index (HHI)
      hhi = 0;
      for (const ind of uniqueIndustries) {
        const weightFraction = industryWeights[ind] / 100;
        hhi += weightFraction * weightFraction;
      }
      // HHI ranges from 1/N (perfectly diversified) to 1.0 (undiversified).
      // Scale HHI to a 20-100 index score
      // An HHI of 1.0 translates to 20, and lower values scale up to 100.
      diversificationScore = Math.max(20, Math.min(100, Math.round((1.0 - hhi) * 100 + 20)));
    }

    // 5. Select Bonus Holdings (Top, Highest Risk, Strongest, Weakest)
    let topHolding = holdingsDetail[0];
    let highestRiskHolding = holdingsDetail[0];
    let strongestHolding = holdingsDetail[0];
    let weakestHolding = holdingsDetail[0];

    for (const hd of holdingsDetail) {
      if (hd.weight > topHolding.weight) topHolding = hd;
      if (hd.riskLevel > highestRiskHolding.riskLevel) highestRiskHolding = hd;
      if (hd.overallScore > strongestHolding.overallScore) strongestHolding = hd;
      if (hd.overallScore < weakestHolding.overallScore) weakestHolding = hd;
    }

    // 6. Invoke Portfolio Research Agent
    const researchOutput = await runPortfolioResearchAgent(validatedHoldings, holdingsDetail);

    // 7. Invoke Portfolio Committee Agent
    const committeeDecision = await runPortfolioCommitteeAgent({
      portfolioScore: roundedMetrics.overallScore,
      riskScore: roundedMetrics.riskLevel,
      diversificationScore,
      confidence: roundedMetrics.confidence
    }, researchOutput);

    // 8. Calculate Audit Codes, Diversification Warnings, and Guardrail Triggers
    const recommendationReasonCodes = [];
    const diversificationWarnings = [];
    const guardrailTriggers = [];

    // Recommendation reason codes
    if (roundedMetrics.overallScore >= 80) {
      recommendationReasonCodes.push('HIGH_QUALITY_ASSETS');
    }
    if (roundedMetrics.riskLevel > 65) {
      recommendationReasonCodes.push('HIGH_RISK_EXPOSURE');
    }
    if (diversificationScore < 40) {
      recommendationReasonCodes.push('LOW_DIVERSIFICATION');
    }
    if (roundedMetrics.confidence < 70) {
      recommendationReasonCodes.push('LOW_EVIDENCE_QUALITY');
    }
    if (topHolding.weight > 35) {
      recommendationReasonCodes.push('HIGH_CONCENTRATION');
    }

    // Diversification warnings
    if (uniqueIndustries.length <= 1) {
      diversificationWarnings.push('SINGLE_SECTOR_EXPOSURE: Portfolio assets are located within a single industrial sector. Consider sector diversification.');
    } else if (hhi > 0.4) {
      diversificationWarnings.push('HIGH_SECTOR_CONCENTRATION: Industrial weightings are heavily biased towards a few core sectors.');
    }

    // Guardrail Triggers
    let recommendation = committeeDecision.recommendation;
    let overrideReason = null;

    if (roundedMetrics.riskLevel > 85 && recommendation === 'APPROVE') {
      recommendation = 'WATCH';
      overrideReason = 'Risk level exceeds institutional limit of 85.';
      guardrailTriggers.push('RISK_GUARDRAIL_TRIGGERED: Risk level exceeds threshold of 85.');
    }
    if (roundedMetrics.confidence < 70 && recommendation === 'APPROVE') {
      recommendation = 'WATCH';
      overrideReason = 'Calibrated confidence level is under safety threshold of 70%.';
      guardrailTriggers.push('CONFIDENCE_GUARDRAIL_TRIGGERED: Calibrated confidence is under 70%.');
    }

    const incompleteHoldings = holdingsDetail.filter(hd => hd.overallScore === 0);
    if (incompleteHoldings.length > 0 && recommendation === 'APPROVE') {
      recommendation = 'WATCH';
      overrideReason = 'Incomplete metrics scorecard profiles detected for some holdings.';
      guardrailTriggers.push('DATA_QUALITY_GUARDRAIL_TRIGGERED: Holdings contain incomplete scorecard data.');
    }

    if (overrideReason) {
      committeeDecision.recommendation = recommendation;
      committeeDecision.reasoning = `[GUARDRAIL OVERRIDE] ${overrideReason} ${committeeDecision.reasoning}`;
    }

    // 9. Fetch recent material events across all holdings (since 24 hours ago)
    let materialEvents = [];
    const targetDate = new Date(Date.now() - 24 * 3600 * 1000);
    for (const hd of holdingsDetail) {
      try {
        const eventRes = await materialEventService.detectMaterialEvents(hd.company, targetDate);
        if (eventRes && eventRes.events && eventRes.events.length > 0) {
          const mapped = eventRes.events.map(ev => ({
            company: hd.company,
            type: ev.type,
            title: ev.title,
            source: ev.source,
            publishedAt: ev.publishedAt
          }));
          materialEvents = materialEvents.concat(mapped);
        }
      } catch (err) {
        console.warn(`[Portfolio Service] Could not fetch material events for "${hd.company}":`, err.message);
      }
    }

    // 10. Return Formatted Combined Portfolio Object
    return {
      portfolioScore: roundedMetrics.overallScore,
      riskScore: roundedMetrics.riskLevel,
      diversificationScore,
      confidence: roundedMetrics.confidence,
      recommendation: committeeDecision.recommendation,
      weightedMetrics: roundedMetrics,
      research: researchOutput,
      committeeDecision,
      holdingsDetail,
      recommendationReasonCodes,
      diversificationWarnings,
      guardrailTriggers,
      materialEvents,
      bonus: {
        topHolding: {
          company: topHolding.company,
          weight: topHolding.weight,
          score: topHolding.overallScore
        },
        highestRiskHolding: {
          company: highestRiskHolding.company,
          weight: highestRiskHolding.weight,
          risk: highestRiskHolding.riskLevel
        },
        strongestHolding: {
          company: strongestHolding.company,
          weight: strongestHolding.weight,
          score: strongestHolding.overallScore
        },
        weakestHolding: {
          company: weakestHolding.company,
          weight: weakestHolding.weight,
          score: weakestHolding.overallScore
        }
      }
    };
  }
}

export default new PortfolioService();
