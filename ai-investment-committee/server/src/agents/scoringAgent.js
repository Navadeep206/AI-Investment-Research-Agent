import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getScoringPrompt } from "../prompts/scoringPrompt.js";
import { scoringSchema } from "../schemas/scoringSchema.js";
import { getMockScorecard } from "../utils/mockDataProvider.js";

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
 * Runs the Investment Scoring Agent.
 * Evaluates the compiled research report and returns a structured scorecard.
 * Implements a single automated correction retry policy.
 * 
 * @param {string} companyName Company profile name
 * @param {Object} researchReport Report output from Research Agent
 * @returns {Promise<Object>} Validated investment scorecard
 */
export const runScoringAgent = async (companyName, researchReport) => {
  if (process.env.MOCK_LLM === 'true') {
    console.log(`[Scoring Agent] [MOCK MODE] Returning dynamic mock scorecard for "${companyName}"`);
    return getMockScorecard(companyName);
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

  const prompt = getScoringPrompt(companyName, researchReport);
  let responseText = "";

  try {
    console.log(`[Scoring Agent] Dispatching analysis for "${companyName}" to Gemini (Attempt 1)...`);
    const response = await model.invoke(prompt);
    responseText = response.content;

    // Parse and validate response
    const cleanedText = cleanResponseText(responseText);
    const parsedData = JSON.parse(cleanedText);
    const validatedData = scoringSchema.parse(parsedData);

    console.log(`[Scoring Agent] Scoring succeeded on first attempt.`);
    return validatedData;
  } catch (firstAttemptError) {
    console.warn(`[Scoring Agent] First attempt failed: ${firstAttemptError.message}. Retrying one time with correction prompt...`);

    try {
      const retryPrompt = `${prompt}

WARNING: Your previous response failed parsing or validation.
The error encountered was: "${firstAttemptError.message}"
Raw text received was:
"${responseText}"

Please correct the response. Return ONLY a valid JSON string that matches the required schema keys. Ensure that the recommendation conforms to overallScore thresholds (>=80 is INVEST, >=60 is WATCH, <60 is PASS). Do not write markdown wraps or explanations.`;

      console.log(`[Scoring Agent] Dispatching corrected scoring query to Gemini (Attempt 2)...`);
      const retryResponse = await model.invoke(retryPrompt);
      const cleanedRetryText = cleanResponseText(retryResponse.content);
      const parsedRetryData = JSON.parse(cleanedRetryText);
      const validatedRetryData = scoringSchema.parse(parsedRetryData);

      console.log(`[Scoring Agent] Scoring succeeded on second attempt.`);
      return validatedRetryData;
    } catch (secondAttemptError) {
      console.error(`[Scoring Agent] Both attempts failed. Final error: ${secondAttemptError.message}`);
      throw new Error("Investment scoring failed due to persistent parsing or validation errors");
    }
  }
};

/**
 * Standard agent node signature for LangGraph compatibility.
 */
export const scoringAgent = async (state) => {
  console.log("[Graph Node] Scoring Agent executing...");
  try {
    const scorecard = await runScoringAgent(state.company, state.research);
    return { scorecard };
  } catch (err) {
    console.error(`[Graph Node] Scoring Agent failed: ${err.message}`);
    throw err;
  }
};
