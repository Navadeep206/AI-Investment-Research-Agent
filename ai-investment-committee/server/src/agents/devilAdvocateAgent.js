import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getDevilAdvocatePrompt } from "../prompts/devilAdvocatePrompt.js";
import { devilAdvocateSchema } from "../schemas/devilAdvocateSchema.js";
import { getMockChallenge } from "../utils/mockDataProvider.js";

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
 * Runs the Devil's Advocate Agent.
 * Critically evaluates a company's research report and scorecard, producing an adversarial challenge scorecard.
 * Implements a single automated correction retry policy.
 * 
 * @param {string} companyName Company profile name
 * @param {Object} researchReport Report output from Research Agent
 * @param {Object} scorecard Scorecard output from Scoring Agent
 * @returns {Promise<Object>} Validated bear scorecard challenge
 */
export const runDevilAdvocateAgent = async (companyName, researchReport, scorecard) => {
  if (process.env.MOCK_LLM === 'true') {
    console.log(`[Devil's Advocate] [MOCK MODE] Returning dynamic mock challenge for "${companyName}"`);
    return getMockChallenge(companyName);
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

  const prompt = getDevilAdvocatePrompt(companyName, researchReport, scorecard);
  let responseText = "";

  try {
    console.log(`[Devil's Advocate] Dispatching adversarial query for "${companyName}" to Gemini (Attempt 1)...`);
    const response = await model.invoke(prompt);
    responseText = response.content;

    // Parse and validate response
    const cleanedText = cleanResponseText(responseText);
    const parsedData = JSON.parse(cleanedText);
    const validatedData = devilAdvocateSchema.parse(parsedData);

    console.log(`[Devil's Advocate] Challenge compiled successfully.`);
    return validatedData;
  } catch (error) {
    console.error(`[Devil's Advocate] Challenge failed: ${error.message}`);
    throw error;
  }
};

/**
 * Standard agent node signature for LangGraph compatibility.
 */
export const devilAdvocateAgent = async (state) => {
  console.log("[Graph Node] Devil's Advocate Agent executing...");
  try {
    const challenge = await runDevilAdvocateAgent(
      state.company,
      state.research,
      state.scorecard
    );
    return { challenge };
  } catch (err) {
    console.error(`[Graph Node] Devil's Advocate Agent failed: ${err.message}`);
    throw err;
  }
};
