import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from 'zod';

export const portfolioResearchSchema = z.object({
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  sectorExposure: z.array(z.object({
    sector: z.string(),
    weight: z.number()
  })),
  concentrationRisks: z.array(z.string())
});

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
 * Runs the Portfolio Research Agent.
 * Analyzes the list of holdings, weights, and their scorecards to output strengths,
 * weaknesses, sector exposures, and concentration risks.
 */
export const runPortfolioResearchAgent = async (holdings, scorecards) => {
  if (process.env.MOCK_LLM === 'true') {
    console.log(`[Portfolio Research Agent] [MOCK MODE] Returning mock research analysis`);
    
    // Group sector weights based on inputs
    const techWeight = holdings.reduce((sum, h) => {
      const compLower = h.company.toLowerCase();
      if (compLower.includes('nvidia') || compLower.includes('amd') || compLower.includes('microsoft') || compLower.includes('google') || compLower.includes('apple')) {
        return sum + h.weight;
      }
      return sum;
    }, 0);
    const otherWeight = 100 - techWeight;

    const sectorExposure = [
      { sector: 'Technology & AI Infrastructure', weight: techWeight }
    ];
    if (otherWeight > 0) {
      sectorExposure.push({ sector: 'Other Industries', weight: otherWeight });
    }

    return {
      strengths: [
        "High weighted allocation to industry-dominant market leaders with extensive software and hardware competitive moats.",
        "Excellent overall weighted financial strength, reflecting robust cash flows and low debt-leverage risk profiles."
      ],
      weaknesses: [
        "Elevated susceptibility to tech sector cyclicality and semiconductor supply chain shocks.",
        "Premium valuation multiples across major holdings require sustained double-digit earnings growth."
      ],
      sectorExposure,
      concentrationRisks: holdings.some(h => h.weight >= 35) 
        ? ["Individual holding weight equal to or exceeding 35% creates significant single-stock drawdown risk."]
        : ["Portfolio weights are moderately distributed, reducing individual asset tail-risk exposure."]
    };
  }

  const modelName = "gemini-2.5-flash";
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Please set GEMINI_API_KEY or GOOGLE_API_KEY.");
  }

  const model = new ChatGoogleGenerativeAI({
    model: modelName,
    apiKey: apiKey,
    temperature: 0.1,
  });

  // Prepare input report data for prompt
  const holdingsSummary = holdings.map((h, i) => {
    const card = scorecards[i] || {};
    return `- Company: ${h.company} (Weight: ${h.weight}%)
  * Industry: ${card.industry || 'Unknown'}
  * Scorecard: Business Quality: ${card.businessQuality}/100, Growth Potential: ${card.growthPotential}/100, Competitive Moat: ${card.competitiveMoat}/100, Financial Strength: ${card.financialStrength}/100, Risk Level: ${card.riskLevel}/100, Overall Score: ${card.overallScore}/100
  * Committee Recommendation: ${card.recommendation || 'WATCH'}`;
  }).join('\n');

  const prompt = `You are an expert Portfolio Research Analyst at an institutional investment firm.
Your task is to analyze a proposed investment portfolio and compile research-level insights.

Proposed Holdings & Metrics:
${holdingsSummary}

Please compile:
1. Portfolio Strengths (2-3 concrete bullet points)
2. Portfolio Weaknesses & Headwinds (2-3 concrete bullet points)
3. Sector & Industry Exposure breakdown (with sector names and weighted allocation percentages sum matching 100%)
4. Concentration Risks (e.g. single stock weight risks, sector weights)

You MUST respond ONLY with a raw JSON object matching the following structure:
{
  "strengths": ["string"],
  "weaknesses": ["string"],
  "sectorExposure": [
    { "sector": "string", "weight": number }
  ],
  "concentrationRisks": ["string"]
}

Ensure the sector weights sum to exactly 100%. Do not include markdown formatting, explanations, or code blocks in your final output. Return ONLY valid JSON.`;

  let responseText = "";
  try {
    console.log(`[Portfolio Research Agent] Querying Gemini for portfolio analysis (Attempt 1)...`);
    const response = await model.invoke(prompt);
    responseText = response.content;

    const cleanedText = cleanResponseText(responseText);
    const parsedData = JSON.parse(cleanedText);
    const validatedData = portfolioResearchSchema.parse(parsedData);
    return validatedData;
  } catch (err) {
    console.warn(`[Portfolio Research Agent] Attempt 1 failed: ${err.message}. Retrying...`);
    try {
      const retryPrompt = `${prompt}
      
WARNING: Your previous response failed parsing or validation.
The error encountered was: "${err.message}"
Raw text received was:
"${responseText}"

Correct the response. Return ONLY a valid JSON string matching the required schema. Do not write markdown wraps or explanations.`;

      const retryResponse = await model.invoke(retryPrompt);
      const cleanedRetryText = cleanResponseText(retryResponse.content);
      const parsedRetryData = JSON.parse(cleanedRetryText);
      const validatedRetryData = portfolioResearchSchema.parse(parsedRetryData);
      return validatedRetryData;
    } catch (retryErr) {
      console.error(`[Portfolio Research Agent] Both attempts failed: ${retryErr.message}`);
      throw new Error(`Portfolio research agent execution failed: ${retryErr.message}`);
    }
  }
};
