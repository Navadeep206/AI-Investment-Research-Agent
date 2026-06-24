import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getResearchPrompt } from "../prompts/researchPrompt.js";
import { researchSchema } from "../schemas/researchSchema.js";
import { getMockResearch } from "../utils/mockDataProvider.js";

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
 * Executes the Research Agent analysis.
 * Passes company overview details to Gemini 2.5 Flash and validates the response schema.
 * Implements a single automated retry policy for invalid formats.
 * 
 * @param {Object} companyData Combined profile from Wikipedia + Yahoo Finance
 * @returns {Promise<Object>} Validated investment report
 */
export const runResearchAgent = async (companyData, evidence) => {
  if (process.env.MOCK_LLM === 'true') {
    const targetComp = companyData.company || 'AMD';
    console.log(`[Research Agent] [MOCK MODE] Returning dynamic mock research report for "${targetComp}"`);
    return getMockResearch(targetComp);
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Please set GEMINI_API_KEY or GOOGLE_API_KEY in the environment.");
  }

  // Instantiate ChatGoogleGenerativeAI
  const model = new ChatGoogleGenerativeAI({
    model: modelName,
    apiKey: apiKey,
    temperature: 0.1,
    maxRetries: 1,
  });

  const prompt = getResearchPrompt(companyData, evidence);
  let responseText = "";

  try {
    console.log(`[Research Agent] Dispatching analysis for "${companyData.company}" to Gemini (Attempt 1)...`);
    const response = await model.invoke(prompt);
    responseText = response.content;
    
    // Parse and validate
    const cleanedText = cleanResponseText(responseText);
    const parsedData = JSON.parse(cleanedText);
    const validatedData = researchSchema.parse(parsedData);
    
    console.log(`[Research Agent] Analysis succeeded.`);
    return validatedData;
  } catch (error) {
    console.error(`[Research Agent] Analysis failed: ${error.message}`);
    throw error;
  }
};

/**
 * Standard agent node signature for LangGraph compatibility.
 */
export const researchAgent = async (state) => {
  console.log("[Graph Node] Research Agent executing...");
  try {
    const report = await runResearchAgent(state.companyData, state.evidence);
    return { research: report };
  } catch (err) {
    console.error(`[Graph Node] Research Agent failed: ${err.message}`);
    throw err;
  }
};
