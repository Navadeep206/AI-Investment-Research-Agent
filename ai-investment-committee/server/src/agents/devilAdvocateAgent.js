import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getDevilAdvocatePrompt } from "../prompts/devilAdvocatePrompt.js";
import { devilAdvocateSchema } from "../schemas/devilAdvocateSchema.js";

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
    console.log(`[Devil's Advocate] [MOCK MODE] Returning mock challenge for "${companyName}"`);
    return {
      bearCase: "AMD is a distant second to NVIDIA in AI compute, and margins may be pressured by TSMC wafer pricing.",
      keyConcerns: [
        "NVIDIA CUDA software moat is highly sticky",
        "Intel's foundry roadmap could regain process parity"
      ],
      hiddenRisks: [
        "Taiwan geopolitical risk affecting single-source TSMC supply"
      ],
      worstCaseScenario: "NVIDIA pricing aggressiveness squeezes AMD AI GPU gross margins to under 40%.",
      counterArguments: [
        "Cloud providers desperately want a second source to avoid NVIDIA monopoly pricing"
      ]
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

    console.log(`[Devil's Advocate] Challenge compiled successfully on first attempt.`);
    return validatedData;
  } catch (firstAttemptError) {
    console.warn(`[Devil's Advocate] First attempt failed: ${firstAttemptError.message}. Retrying one time with correction prompt...`);

    try {
      const retryPrompt = `${prompt}

WARNING: Your previous response failed parsing or validation.
The error encountered was: "${firstAttemptError.message}"
Raw text received was:
"${responseText}"

Please correct the response. Return ONLY a valid JSON string that matches the required schema keys. Do not write markdown wraps or explanations.`;

      console.log(`[Devil's Advocate] Dispatching corrected challenge query to Gemini (Attempt 2)...`);
      const retryResponse = await model.invoke(retryPrompt);
      const cleanedRetryText = cleanResponseText(retryResponse.content);
      const parsedRetryData = JSON.parse(cleanedRetryText);
      const validatedRetryData = devilAdvocateSchema.parse(parsedRetryData);

      console.log(`[Devil's Advocate] Challenge compiled successfully on second attempt.`);
      return validatedRetryData;
    } catch (secondAttemptError) {
      console.error(`[Devil's Advocate] Both attempts failed. Final error: ${secondAttemptError.message}`);
      throw new Error("Thesis challenge failed due to persistent parsing or validation errors");
    }
  }
};

/**
 * Standard agent node signature for LangGraph compatibility.
 */
export const devilAdvocateAgent = async (state) => {
  console.log("[Graph Node] Devil's Advocate Agent executing...");
  try {
    const challenge = await runDevilAdvocateAgent(
      state.companyData.company,
      state.researchReport,
      state.scorecard
    );
    return {
      ...state,
      challenge,
      messages: [
        ...(state.messages || []),
        {
          role: "assistant",
          sender: "DevilAdvocateAgent",
          content: JSON.stringify(challenge)
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
          sender: "DevilAdvocateAgent",
          content: `Failed to compile thesis challenge: ${err.message}`
        }
      ]
    };
  }
};
