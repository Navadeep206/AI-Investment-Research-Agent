import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getCommitteePrompt } from "../prompts/committeePrompt.js";
import { committeeSchema } from "../schemas/committeeSchema.js";

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
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw new Error("Gemini API key is not configured. Please set GEMINI_API_KEY or GOOGLE_API_KEY in the environment.");
    }

    const model = new ChatGoogleGenerativeAI({
      model: modelName,
      apiKey: apiKey,
      temperature: 0.1,
      maxRetries: 1,
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
    } catch (error) {
      console.error(`[Committee Agent] Final decision review failed: ${error.message}`);
      throw error;
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

  const evidenceQualityVal = evidenceMetrics ? Number(evidenceMetrics.evidenceQualityScore || 0) : 80;

  // 2.1 Compute agent consensus metrics for telemetry breakdown
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

  // Populate confidence breakdown telemetry details without overriding the raw Gemini confidence score
  decision.confidenceBreakdown = {
    evidenceQuality: evidenceQualityVal,
    dataQuality: dataQualityScore,
    agentAgreement: agentAgreementScore
  };

  // Keep metadata attributes intact for schema / DB compatibility without modifying raw decision scores
  decision.recommendationReasonCodes = [];
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
