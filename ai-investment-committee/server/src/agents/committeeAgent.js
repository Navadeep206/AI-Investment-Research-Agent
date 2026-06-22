import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getCommitteePrompt } from "../prompts/committeePrompt.js";
import { committeeSchema } from "../schemas/committeeSchema.js";
import confidenceService from "../services/confidenceService.js";

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

/**
 * Runs the Investment Committee Agent.
 * Synthesizes the Research report, Scorecard grades, and Devil's Advocate challenges.
 * Programmatically enforces recommendation guardrails, confidence caps, and quality indices.
 * 
 * @param {Object} research Report output from Research Agent
 * @param {Object} scorecard Scorecard output from Scoring Agent
 * @param {Object} challenge Challenge output from Devil's Advocate Agent
 * @param {number} sourcesUsed Number of sources analyzed
 * @param {Object} evidenceMetrics Quality/Tier metrics of evidence sources
 * @param {Array} failedNodes Array of agent names that failed and triggered circuit breakers
 * @returns {Promise<Object>} Validated and hardened committee final decision
 */
export const runCommitteeAgent = async (
  research, 
  scorecard, 
  challenge, 
  sourcesUsed = 0, 
  evidenceMetrics = null, 
  failedNodes = []
) => {
  let decision;

  const getDecisionFromLLM = async () => {
    const modelName = "gemini-2.5-flash";
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw new Error("Gemini API key is not configured. Please set GEMINI_API_KEY or GOOGLE_API_KEY in the environment.");
    }

    const model = new ChatGoogleGenerativeAI({
      model: modelName,
      apiKey: apiKey,
      temperature: 0.1,
    });

    const prompt = getCommitteePrompt(research, scorecard, challenge, sourcesUsed, evidenceMetrics);
    let responseText = "";

    try {
      console.log(`[Committee Agent] Dispatching final committee review to Gemini (Attempt 1)...`);
      const response = await model.invoke(prompt);
      responseText = response.content;

      const cleanedText = cleanResponseText(responseText);
      const parsedData = JSON.parse(cleanedText);
      return committeeSchema.parse(parsedData);
    } catch (firstAttemptError) {
      console.warn(`[Committee Agent] First attempt failed: ${firstAttemptError.message}. Retrying one time with correction prompt...`);

      const retryPrompt = `${prompt}

WARNING: Your previous response failed parsing or validation.
The error encountered was: "${firstAttemptError.message}"
Raw text received was:
"${responseText}"

Please correct the response. Return ONLY a valid JSON string that matches the required schema keys. Do not write markdown wraps or explanations.`;

      console.log(`[Committee Agent] Dispatching corrected final decision query to Gemini (Attempt 2)...`);
      const retryResponse = await model.invoke(retryPrompt);
      const cleanedRetryText = cleanResponseText(retryResponse.content);
      const parsedRetryData = JSON.parse(cleanedRetryText);
      return committeeSchema.parse(parsedRetryData);
    }
  };

  // 1. Resolve raw recommendation details (Mock mode vs. LLM)
  if (process.env.MOCK_LLM === 'true') {
    let companyName = "AMD";
    if (research && research.businessOverview) {
      const overview = research.businessOverview;
      if (overview.includes("NVIDIA Corporation")) {
        companyName = "NVIDIA Corporation";
      } else if (overview.includes("Advanced Micro Devices")) {
        companyName = "Advanced Micro Devices, Inc.";
      } else if (overview.includes("Microsoft Corporation")) {
        companyName = "Microsoft Corporation";
      } else if (overview.includes("Alphabet Inc.") || overview.includes("Google")) {
        companyName = "Alphabet Inc.";
      } else {
        const match = overview.match(/^(.+?)\s+is\s+(?:a|an)\s+/);
        if (match && match[1]) {
          companyName = match[1];
        }
      }
    }
    console.log(`[Committee Agent] [MOCK MODE] Returning dynamic mock committee decision for "${companyName}"`);
    const { getMockCommitteeDecision } = await import("../utils/mockDataProvider.js");
    decision = getMockCommitteeDecision(companyName, sourcesUsed, evidenceMetrics);
  } else {
    try {
      decision = await getDecisionFromLLM();
    } catch (err) {
      console.error(`[Committee Agent] LLM execution failed, using secondary fallback inside agent.`, err.message);
      decision = {
        recommendation: "WATCH",
        confidence: 50,
        reasoning: "Fallback: The final committee LLM node encountered an execution error and returned a safety Watch status.",
        keyFactors: ["LLM Generation Failure"],
        sourcesUsed: sourcesUsed,
        evidenceQualityScore: evidenceMetrics ? evidenceMetrics.evidenceQualityScore : 50,
        tierBreakdown: {
          tierA: evidenceMetrics ? (evidenceMetrics.tierA || 0) : 0,
          tierB: evidenceMetrics ? (evidenceMetrics.tierB || 0) : 0,
          tierC: evidenceMetrics ? (evidenceMetrics.tierC || 0) : 0,
          tierD: evidenceMetrics ? (evidenceMetrics.tierD || 0) : 0
        },
        decisionOverrideReason: "System agent execution error."
      };
    }
  }

  // 2. Compute Data Quality Score (Drop by 20 for each failed node)
  const failedNodesCount = Array.isArray(failedNodes) ? failedNodes.length : 0;
  const dataQualityScore = Math.max(0, 100 - (failedNodesCount * 20));

  // 2.1 Calculate Agent Agreement Score
  let agentAgreementScore = 100;
  const scoringRec = scorecard ? scorecard.recommendation : null;
  const committeeRec = decision.recommendation;

  const failedNodeArray = Array.isArray(failedNodes) ? failedNodes : [];
  if (failedNodeArray.includes("Scoring Agent") || failedNodeArray.includes("Committee Agent")) {
    agentAgreementScore = 50;
  } else if (scoringRec && committeeRec) {
    if (scoringRec !== committeeRec) {
      if (
        (scoringRec === 'INVEST' && committeeRec === 'PASS') ||
        (scoringRec === 'PASS' && committeeRec === 'INVEST')
      ) {
        agentAgreementScore = 50;
      } else {
        agentAgreementScore = 75;
      }
    }
  }

  // 2.2 Calculate Calibrated Confidence
  const riskVal = scorecard ? Number(scorecard.riskLevel || 50) : 50;
  const evidenceQualityVal = evidenceMetrics ? Number(evidenceMetrics.evidenceQualityScore || 0) : 80;
  
  const calibrated = confidenceService.calculateConfidence(evidenceQualityVal, dataQualityScore, agentAgreementScore);
  decision.confidence = calibrated.confidence;
  decision.confidenceBreakdown = calibrated.confidenceBreakdown;

  // 3. Programmatically Enforce recommendation Reason Codes & Guardrails
  const recommendationReasonCodes = [];
  const overrideReasons = [];

  // Rule 3.1: Source Trust - Tier A Influence (Feature 3)
  if (evidenceMetrics) {
    if (evidenceMetrics.tierA === 0) {
      if (scorecard) {
        // Cap overallScore to 65 since Tier B/C/D cannot influence numeric scores above 65
        scorecard.overallScore = Math.min(scorecard.overallScore || 50, 65);
      }
      recommendationReasonCodes.push('NO_TIER_A_SOURCES');
      overrideReasons.push('Overall score capped at 65 and recommendation capped at WATCH because there are no Tier A sources.');
      if (decision.recommendation === 'INVEST') {
        decision.recommendation = 'WATCH';
      }
    }

    // Rule 3.2: Source Trust - Tier C/D Confidence Cap (Feature 3)
    if (evidenceMetrics.tierC + evidenceMetrics.tierD > 0) {
      if (decision.confidence > 75) {
        decision.confidence = 75;
        recommendationReasonCodes.push('TIER_C_D_CONFIDENCE_CAP');
        overrideReasons.push('Recommendation confidence capped at 75 due to presence of low-credibility Tier C/D evidence.');
      }
    }
  }

  // Rule 3.3: Recommendation Guardrails (Feature 2)
  if (decision.recommendation === 'INVEST') {
    if (riskVal > 85) {
      decision.recommendation = 'WATCH';
      recommendationReasonCodes.push('HIGH_RISK');
      overrideReasons.push(`Recommendation overridden to WATCH because risk level (${riskVal}) exceeds maximum safety limit of 85.`);
    }
    
    if (evidenceQualityVal < 70) {
      decision.recommendation = 'WATCH';
      recommendationReasonCodes.push('LOW_EVIDENCE_QUALITY');
      overrideReasons.push(`Recommendation overridden to WATCH because evidence quality (${evidenceQualityVal}) is below minimum safety threshold of 70.`);
    }

    if (dataQualityScore < 90) {
      decision.recommendation = 'WATCH';
      recommendationReasonCodes.push('LOW_DATA_QUALITY');
      overrideReasons.push(`Recommendation overridden to WATCH because data quality rating (${dataQualityScore}) is below safety limit of 90.`);
    }
  }

  // 4. Update decision fields with audit trail details (Feature 4 & 7)
  if (overrideReasons.length > 0) {
    decision.decisionOverrideReason = decision.decisionOverrideReason
      ? `${decision.decisionOverrideReason}; ${overrideReasons.join('; ')}`
      : overrideReasons.join('; ');
  }

  decision.recommendationReasonCodes = recommendationReasonCodes;
  decision.dataQualityScore = dataQualityScore;
  decision.evidenceQualityScore = evidenceQualityVal;
  decision.freshnessScore = 100; // Live at run time
  decision.evidenceAgeMinutes = 0; // Live at run time

  return decision;
};

/**
 * Standard agent node signature for LangGraph compatibility.
 */
export const committeeAgent = async (state) => {
  console.log("[Graph Node] Committee Agent executing...");
  try {
    const sourcesUsed = state.evidence ? state.evidence.length : 0;
    const finalDecision = await runCommitteeAgent(
      state.research,
      state.scorecard,
      state.challenge,
      sourcesUsed,
      state.evidenceMetrics,
      state.failedNodes || []
    );
    return {
      finalDecision
    };
  } catch (err) {
    console.error(`[Graph Node] Committee Agent failed: ${err.message}`);
    throw err;
  }
};
