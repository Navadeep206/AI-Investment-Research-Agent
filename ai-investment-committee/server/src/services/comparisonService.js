import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import cacheService from "./cacheService.js";
import analysisService from "./analysisService.js";
import { getComparisonPrompt } from "../prompts/comparisonPrompt.js";
import { comparisonLlmSchema } from "../schemas/comparisonSchema.js";

/**
 * Helper to strip markdown code blocks (e.g. ```json ... ```) if returned by the LLM.
 */
const cleanResponseText = (text) => {
  if (typeof text !== 'string') return '';
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(json)?/i, '');
  cleaned = cleaned.replace(/```$/, '');
  return cleaned.trim();
};

class ComparisonService {
  /**
   * Compares scores for a category. Higher score wins, except for riskLevel where lower score wins.
   */
  getCategoryWinner(nameA, scoreA, nameB, scoreB, categoryKey) {
    if (scoreA === undefined || scoreA === null || scoreB === undefined || scoreB === null) {
      return "TIE";
    }

    if (categoryKey === "riskLevel") {
      // Lower risk is better
      if (scoreA < scoreB) return nameA;
      if (scoreB < scoreA) return nameB;
      return "TIE";
    }

    // Higher is better for all other categories
    if (scoreA > scoreB) return nameA;
    if (scoreB > scoreA) return nameB;
    return "TIE";
  }

  /**
   * Normalizes a scorecard to ensure all fields are present, using null for missing fields.
   * Calculates a completeness score (100 = all present, -20 for each missing field).
   */
  normalizeScorecard(analysis) {
    if (!analysis) {
      return {
        normalized: {
          businessQuality: null,
          growthPotential: null,
          competitiveMoat: null,
          financialStrength: null,
          riskLevel: null,
          overallScore: null,
          recommendation: null
        },
        completenessScore: 0
      };
    }

    const scorecard = analysis.scorecard || {};
    const fields = [
      'businessQuality',
      'growthPotential',
      'competitiveMoat',
      'financialStrength',
      'riskLevel',
      'overallScore',
      'recommendation'
    ];

    const normalized = {};
    let missingCount = 0;

    for (const field of fields) {
      let val;
      if (field === 'recommendation') {
        // Prioritize final committee decision over un-capped scorecard recommendation
        val = analysis.recommendation || (analysis.finalDecision && analysis.finalDecision.recommendation) || scorecard.recommendation;
      } else {
        // Check nested scorecard first, fallback to parent analysis fields
        val = scorecard[field];
        if (val === undefined || val === null) {
          val = analysis[field];
        }
      }

      if (val !== undefined && val !== null) {
        normalized[field] = val;
      } else {
        normalized[field] = null;
        missingCount++;
      }
    }

    const completenessScore = Math.max(0, 100 - (missingCount * 20));

    return {
      normalized,
      completenessScore
    };
  }

  /**
   * Generates comparison insights programmatically as a fallback.
   */
  generateComparisonInsights(nameA, nameB, analysisA, analysisB, normA, normB) {
    const scoreA = normA.normalized.overallScore !== null ? normA.normalized.overallScore : 'N/A';
    const scoreB = normB.normalized.overallScore !== null ? normB.normalized.overallScore : 'N/A';
    const qualityA = normA.normalized.businessQuality !== null ? normA.normalized.businessQuality : 'N/A';
    const qualityB = normB.normalized.businessQuality !== null ? normB.normalized.businessQuality : 'N/A';
    const riskA = normA.normalized.riskLevel !== null ? normA.normalized.riskLevel : 'N/A';
    const riskB = normB.normalized.riskLevel !== null ? normB.normalized.riskLevel : 'N/A';

    return {
      strengthsA: [
        `Overall thesis score of ${scoreA}`,
        `Business quality rating of ${qualityA}`
      ],
      strengthsB: [
        `Overall thesis score of ${scoreB}`,
        `Business quality rating of ${qualityB}`
      ],
      weaknessesA: [
        `Risk level evaluated at ${riskA}`,
        `Subject to standard devil's advocate headwind checks`
      ],
      weaknessesB: [
        `Risk level evaluated at ${riskB}`,
        `Subject to standard devil's advocate headwind checks`
      ]
    };
  }

  /**
   * Evaluates scores across all 6 compared categories to compute a structured recommendation,
   * metric-driven rationale list, and data completeness warnings.
   */
  generateRecommendationReason({ winner, categories, dataQuality, companyA, companyB }) {
    const result = {
      recommendation: "",
      rationale: [],
      warning: null
    };

    // Data Quality warning check
    if (dataQuality.companyA < 80 || dataQuality.companyB < 80) {
      result.warning = "Comparison contains incomplete historical analysis data.";
    }

    // Handle tie or insufficient data cases
    if (winner === "TIE") {
      result.recommendation = "No clear recommendation due to identical overall scores.";
      return result;
    }

    if (winner === "INSUFFICIENT_DATA") {
      result.recommendation = "Insufficient data to formulate a recommendation.";
      return result;
    }

    // Identify overall winner recommendation text
    result.recommendation = `Choose ${winner}`;

    // Categories to evaluate in order
    const checkKeys = [
      { key: "businessQuality", label: "business quality" },
      { key: "growthPotential", label: "growth potential" },
      { key: "competitiveMoat", label: "competitive moat" },
      { key: "financialStrength", label: "financial strength" },
      { key: "riskLevel", label: "risk profile" },
      { key: "overallScore", label: "overall score" }
    ];

    for (const item of checkKeys) {
      const category = categories[item.key];
      
      // Every rationale item must map to a category winner.
      if (category.winner === winner) {
        const valA = category.companyA.value;
        const valB = category.companyB.value;

        if (item.key === "riskLevel") {
          // Risk Rule: Mention only if both exist and absolute difference >= 5.
          if (category.companyA.available && category.companyB.available) {
            const diff = Math.abs(valA - valB);
            if (diff >= 5) {
              if (winner === companyA.name) {
                result.rationale.push(`Lower risk profile (${valA} vs ${valB})`);
              } else {
                result.rationale.push(`Lower risk profile (${valB} vs ${valA})`);
              }
            }
          }
        } else {
          // Standard higher score category
          if (winner === companyA.name) {
            result.rationale.push(`Higher ${item.label} (${valA} vs ${valB})`);
          } else {
            result.rationale.push(`Higher ${item.label} (${valB} vs ${valA})`);
          }
        }
      }
    }

    return result;
  }

  /**
   * Main service function comparing two target companies.
   */
  async compareCompanies(companyA, companyB) {
    console.log(`[Comparison Service] Initializing comparison for "${companyA}" and "${companyB}"...`);

    // Define workflow callbacks for cache miss cases
    const executeWorkflowA = async (resolvedName, preFetchedData = null) => {
      return await analysisService.runFullAnalysisAndSave(resolvedName || companyA, preFetchedData);
    };

    const executeWorkflowB = async (resolvedName, preFetchedData = null) => {
      return await analysisService.runFullAnalysisAndSave(resolvedName || companyB, preFetchedData);
    };

    // Retrieve analyses using the Smart Cache
    const [analysisA, analysisB] = await Promise.all([
      cacheService.getAnalysisForComparison(companyA, executeWorkflowA),
      cacheService.getAnalysisForComparison(companyB, executeWorkflowB)
    ]);

    const nameA = analysisA.company;
    const nameB = analysisB.company;

    // Add debug logs for both sides before comparison
    console.log(`[DEBUG] Company A: "${nameA}"`);
    console.log(`[DEBUG] Analysis ID A: "${analysisA.id}"`);
    console.log(`[DEBUG] Scorecard A:`, JSON.stringify(analysisA.scorecard || {}));
    console.log(`[DEBUG] Company B: "${nameB}"`);
    console.log(`[DEBUG] Analysis ID B: "${analysisB.id}"`);
    console.log(`[DEBUG] Scorecard B:`, JSON.stringify(analysisB.scorecard || {}));

    // Prevent comparing the same company under different aliases
    if (nameA.toLowerCase() === nameB.toLowerCase()) {
      throw new Error(`Invalid comparison: "${companyA}" and "${companyB}" resolve to the same company ("${nameA}").`);
    }

    // Normalize scorecards and calculate completeness
    const normA = this.normalizeScorecard(analysisA);
    const normB = this.normalizeScorecard(analysisB);

    const dataQuality = {
      companyA: normA.completenessScore,
      companyB: normB.completenessScore
    };

    // Helper to compare a specific scorecard category
    const compareCategory = (key) => {
      const valA = normA.normalized[key];
      const valB = normB.normalized[key];
      const availableA = valA !== null;
      const availableB = valB !== null;

      let winner = "INSUFFICIENT_DATA";
      if (availableA && availableB) {
        winner = this.getCategoryWinner(nameA, valA, nameB, valB, key);
      }

      return {
        companyA: {
          value: valA,
          available: availableA
        },
        companyB: {
          value: valB,
          available: availableB
        },
        winner
      };
    };

    // Build comparison category objects
    const categories = {
      businessQuality: compareCategory("businessQuality"),
      growthPotential: compareCategory("growthPotential"),
      competitiveMoat: compareCategory("competitiveMoat"),
      financialStrength: compareCategory("financialStrength"),
      riskLevel: compareCategory("riskLevel"),
      overallScore: compareCategory("overallScore")
    };

    // Calculate overall statistics
    const overallScoreA = normA.normalized.overallScore;
    const overallScoreB = normB.normalized.overallScore;

    let winner = "INSUFFICIENT_DATA";
    let winnerScore = null;
    let scoreDifference = null;

    if (overallScoreA !== null && overallScoreB !== null) {
      if (overallScoreA > overallScoreB) {
        winner = nameA;
      } else if (overallScoreB > overallScoreA) {
        winner = nameB;
      } else {
        winner = "TIE";
      }
      winnerScore = Math.max(overallScoreA, overallScoreB);
      scoreDifference = Math.abs(overallScoreA - overallScoreB);
    }

    // Call Gemini or bypass if MOCK_LLM is enabled
    let summaryText = "";
    let insightsData = null;

    if (process.env.MOCK_LLM === 'true') {
      console.log(`[Comparison Service] [MOCK MODE] Constructing mock comparison AI outputs...`);
      summaryText = `${nameA} shows outstanding performance in ${overallScoreA && overallScoreB && overallScoreA > overallScoreB ? 'growth and moat vectors' : 'diversification aspects'}, while ${nameB} scores highly in ${overallScoreA && overallScoreB && overallScoreB > overallScoreA ? 'growth and moat vectors' : 'diversification and risk control'}.`;
      insightsData = this.generateComparisonInsights(nameA, nameB, analysisA, analysisB, normA, normB);
    } else {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        console.warn("[Comparison Service] No API Key found, using local fallback metrics");
      } else {
        try {
          const model = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            apiKey: apiKey,
            temperature: 0.2
          });

          const prompt = getComparisonPrompt(nameA, nameB, analysisA, analysisB);
          console.log(`[Comparison Service] Querying Gemini for comparative summary...`);
          
          const response = await model.invoke(prompt);
          const cleanedText = cleanResponseText(response.content);
          const parsed = JSON.parse(cleanedText);
          const validated = comparisonLlmSchema.parse(parsed);

          summaryText = validated.summary;
          insightsData = validated.insights;
        } catch (llmErr) {
          console.error(`[Comparison Service] LLM generation failed: ${llmErr.message}. Executing programmatic fallback.`);
        }
      }
    }

    // Apply programmatic fallbacks if AI extraction failed or API key was missing
    if (!summaryText) {
      summaryText = `${nameA} has an overall investment score of ${overallScoreA !== null ? overallScoreA : 'N/A'}/100. ` +
                    `${nameB} has an overall investment score of ${overallScoreB !== null ? overallScoreB : 'N/A'}/100. ` +
                    `The comparison scorecard shows that ${winner === 'TIE' ? 'both companies have equal overall conviction score.' : winner === 'INSUFFICIENT_DATA' ? 'there is insufficient overall data to decide a winner.' : winner + ' wins on overall investment scorecard.'}`;
    }

    if (!insightsData) {
      insightsData = this.generateComparisonInsights(nameA, nameB, analysisA, analysisB, normA, normB);
    }

    // Build metric-driven recommendation rationale and completeness warning
    const recData = this.generateRecommendationReason({
      winner,
      categories,
      dataQuality,
      companyA: { name: nameA, score: overallScoreA },
      companyB: { name: nameB, score: overallScoreB }
    });

    return {
      success: true,
      companyA: {
        name: nameA,
        score: overallScoreA,
        recommendation: normA.normalized.recommendation || "WATCH"
      },
      companyB: {
        name: nameB,
        score: overallScoreB,
        recommendation: normB.normalized.recommendation || "WATCH"
      },
      dataQuality,
      comparison: {
        winner,
        winnerScore,
        scoreDifference,
        categories,
        summary: summaryText,
        recommendation: recData.recommendation,
        rationale: recData.rationale,
        warning: recData.warning,
        insights: insightsData
      }
    };
  }
}

export default new ComparisonService();
