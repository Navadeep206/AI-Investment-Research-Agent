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

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Please set GEMINI_API_KEY or GOOGLE_API_KEY in the environment.");
  }

  // Instantiate ChatGoogleGenerativeAI model
  const model = new ChatGoogleGenerativeAI({
    model: modelName,
    apiKey: apiKey,
    temperature: 0.1,
    maxRetries: 1,
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

    console.log(`[Scoring Agent] Scoring succeeded.`);
    return validatedData;
  } catch (error) {
    console.error(`[Scoring Agent] Scoring failed: ${error.message}`);
    throw error;
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
