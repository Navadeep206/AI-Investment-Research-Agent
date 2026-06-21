import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getResearchPrompt } from "../prompts/researchPrompt.js";
import { researchSchema } from "../schemas/researchSchema.js";

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
  const modelName = "gemini-2.5-flash";
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Please set GEMINI_API_KEY or GOOGLE_API_KEY in the environment.");
  }

  // Instantiate ChatGoogleGenerativeAI
  const model = new ChatGoogleGenerativeAI({
    model: modelName,
    apiKey: apiKey,
    temperature: 0.1,
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
    
    console.log(`[Research Agent] Analysis succeeded on first attempt.`);
    return validatedData;
  } catch (firstAttemptError) {
    console.warn(`[Research Agent] First attempt failed: ${firstAttemptError.message}. Retrying one time with correction prompt...`);
    
    try {
      const retryPrompt = `${prompt}

WARNING: Your previous response failed parsing or validation.
The error encountered was: "${firstAttemptError.message}"
Raw text received was:
"${responseText}"

Please fix this response. Return ONLY a valid JSON string that matches the required schema keys. Do not output markdown code blocks or explanations.`;

      console.log(`[Research Agent] Dispatching corrected query to Gemini (Attempt 2)...`);
      const retryResponse = await model.invoke(retryPrompt);
      const cleanedRetryText = cleanResponseText(retryResponse.content);
      const parsedRetryData = JSON.parse(cleanedRetryText);
      const validatedRetryData = researchSchema.parse(parsedRetryData);
      
      console.log(`[Research Agent] Analysis succeeded on second attempt.`);
      return validatedRetryData;
    } catch (secondAttemptError) {
      console.error(`[Research Agent] Both attempts failed. Final error: ${secondAttemptError.message}`);
      throw new Error("Research generation failed due to persistent parsing or validation errors");
    }
  }
};

/**
 * Standard agent node signature for LangGraph compatibility.
 */
export const researchAgent = async (state) => {
  console.log("[Graph Node] Research Agent executing...");
  try {
    const report = await runResearchAgent(state.companyData, state.evidence);
    return {
      ...state,
      messages: [
        ...(state.messages || []),
        {
          role: "assistant",
          sender: "ResearchAgent",
          content: JSON.stringify(report)
        }
      ]
    };
  } catch (err) {
    return {
      ...state,
      messages: [
        ...(state.messages || []),
        {
          role: "assistant",
          sender: "ResearchAgent",
          content: `Failed to compile research report: ${err.message}`
        }
      ]
    };
  }
};
