import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getCommitteePrompt } from "../prompts/committeePrompt.js";
import { committeeSchema } from "../schemas/committeeSchema.js";

/**
 * Helper to strip markdown code blocks (e.g. ```json ... ```) if returned by the LLM.
 */
const cleanResponseText = (text) => {
  if (typeof text !== 'string') return '';
  let cleaned = text.trim();
  // Strip starting ```json or ```
  cleaned = cleaned.replace(/^```(json)?/i, '');
  // Strip ending ```
  cleaned = cleaned.replace(/```$/, '');
  return cleaned.trim();
};

/**
 * Runs the Investment Committee Agent.
 * Synthesizes the Research report, Scorecard grades, and Devil's Advocate challenges.
 * Implements a single automated correction retry policy.
 * 
 * @param {Object} research Report output from Research Agent
 * @param {Object} scorecard Scorecard output from Scoring Agent
 * @param {Object} challenge Challenge output from Devil's Advocate Agent
 * @returns {Promise<Object>} Validated committee final decision
 */
export const runCommitteeAgent = async (research, scorecard, challenge, sourcesUsed = 0, evidenceMetrics = null) => {
  if (process.env.MOCK_LLM === 'true') {
    console.log(`[Committee Agent] [MOCK MODE] Returning mock committee decision`);
    return {
      recommendation: "INVEST",
      confidence: 85,
      reasoning: "The committee voted to INVEST based on strong competitive positioning in server CPUs and AI hardware diversification.",
      keyFactors: ["Strong x86 data center CPU share", "Rapid adoption of MI300X AI GPUs"],
      sourcesUsed: sourcesUsed,
      evidenceQualityScore: evidenceMetrics ? evidenceMetrics.evidenceQualityScore : 80,
      tierBreakdown: {
        tierA: evidenceMetrics ? (evidenceMetrics.tierBreakdown?.tierA || 0) : 0,
        tierB: evidenceMetrics ? (evidenceMetrics.tierBreakdown?.tierB || 0) : 0,
        tierC: evidenceMetrics ? (evidenceMetrics.tierBreakdown?.tierC || 0) : 0,
        tierD: evidenceMetrics ? (evidenceMetrics.tierBreakdown?.tierD || 0) : 0
      },
      decisionOverrideReason: null
    };
  }

  const modelName = "gemini-2.5-flash";
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Please set GEMINI_API_KEY or GOOGLE_API_KEY in the environment.");
  }

  // Instantiate ChatGoogleGenerativeAI model
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

    // Parse and validate response
    const cleanedText = cleanResponseText(responseText);
    const parsedData = JSON.parse(cleanedText);

    // Enforce Capping Constraint programmatically as a backup check
    if (evidenceMetrics && evidenceMetrics.evidenceQualityScore < 70) {
      if (parsedData.recommendation === 'INVEST') {
        console.warn(`[Committee Agent] Overriding recommendation from INVEST to WATCH because evidenceQualityScore (${evidenceMetrics.evidenceQualityScore}) < 70.`);
        parsedData.recommendation = 'WATCH';
        parsedData.decisionOverrideReason = `Recommendation programmatically capped at WATCH because evidence quality score (${evidenceMetrics.evidenceQualityScore}) is below 70.`;
      }
    }

    const validatedData = committeeSchema.parse(parsedData);

    console.log(`[Committee Agent] Final decision compiled successfully on first attempt.`);
    return validatedData;
  } catch (firstAttemptError) {
    console.warn(`[Committee Agent] First attempt failed: ${firstAttemptError.message}. Retrying one time with correction prompt...`);

    try {
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
      const validatedRetryData = committeeSchema.parse(parsedRetryData);

      console.log(`[Committee Agent] Final decision compiled successfully on second attempt.`);
      return validatedRetryData;
    } catch (secondAttemptError) {
      console.error(`[Committee Agent] Both attempts failed. Final error: ${secondAttemptError.message}`);
      throw new Error("Investment committee final decision failed due to persistent parsing or validation errors");
    }
  }
};

/**
 * Standard agent node signature for LangGraph compatibility.
 */
export const committeeAgent = async (state) => {
  console.log("[Graph Node] Committee Agent executing...");
  try {
    const decision = await runCommitteeAgent(
      state.research,
      state.scorecard,
      state.challenge,
      state.evidence ? state.evidence.length : 0,
      state.evidenceMetrics || null
    );
    return {
      finalDecision: decision
    };
  } catch (err) {
    console.error(`[Graph Node] Committee Agent failed: ${err.message}`);
    throw err;
  }
};
