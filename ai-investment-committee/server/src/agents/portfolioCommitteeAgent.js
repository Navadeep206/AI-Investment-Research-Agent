import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from 'zod';

export const portfolioCommitteeSchema = z.object({
  recommendation: z.enum(['APPROVE', 'WATCH', 'REJECT']),
  confidence: z.number().int().min(0).max(100),
  reasoning: z.string(),
  keyRisks: z.array(z.string())
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
 * Runs the Portfolio Committee Agent.
 * Reviews compiled weighted portfolio metrics and research details to formulate
 * a final decision (APPROVE | WATCH | REJECT), confidence score, reasoning and risks.
 */
export const runPortfolioCommitteeAgent = async (metrics, research) => {
  if (process.env.MOCK_LLM === 'true') {
    console.log(`[Portfolio Committee Agent] [MOCK MODE] Returning mock committee decision`);
    
    let recommendation = "WATCH";
    let reasoning = "The committee votes to hold the portfolio on a WATCH list. While the constituent asset quality is highly favorable, the sector exposure is heavily concentrated in Technology and AI infrastructure, which exposes capital to near-term multiple contractions.";
    
    if (metrics.portfolioScore >= 80 && metrics.diversificationScore >= 60) {
      recommendation = "APPROVE";
      reasoning = "The committee formally APPROVES this portfolio construction. Constituent assets exhibit top-tier business metrics, strong balance sheets, and sufficient industry diversification to shield capital against idiosyncratic sector drawdowns.";
    } else if (metrics.portfolioScore < 60) {
      recommendation = "REJECT";
      reasoning = "The committee REJECTS this portfolio layout. The combined risk-adjusted scoring bounds and weak underlying financial metrics across the constituent entities violate institutional safety margins.";
    }

    return {
      recommendation,
      confidence: Math.round(metrics.confidence || 80),
      reasoning,
      keyRisks: [
        "High correlation among core assets increases structural sector volatility.",
        "Extended valuation multiples may trigger significant downward revisions on growth guidance revisions."
      ]
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

  const prompt = `You are the Chairman of the AI Investment Advisory Committee.
Your task is to synthesize the portfolio metrics and research analyst insights to deliver a final investment decision.

Portfolio Metrics:
- Weighted Portfolio Score: ${metrics.portfolioScore}/100
- Weighted Risk Score: ${metrics.riskScore}/100 (Higher is riskier)
- Diversification Score: ${metrics.diversificationScore}/100 (Higher is better)
- Weighted Confidence Score: ${metrics.confidence}%

Portfolio Research Summary:
- Strengths: ${research.strengths.join(', ')}
- Weaknesses: ${research.weaknesses.join(', ')}
- Concentration Risks: ${research.concentrationRisks.join(', ')}
- Sector Exposure: ${research.sectorExposure.map(se => `${se.sector} (${se.weight}%)`).join(', ')}

Please evaluate and synthesize these values. Deliberate on whether the layout should be APPROVED, placed on a WATCH list, or REJECTED.
Decision guidelines:
- If weighted portfolio score is high (>=80) and diversification is solid (>=60), favor APPROVE.
- If overall portfolio score is weak (<60) or risk score is extremely high, favor REJECT.
- Otherwise, recommend WATCH.

You MUST respond ONLY with a raw JSON object matching the following structure:
{
  "recommendation": "APPROVE" | "WATCH" | "REJECT",
  "confidence": number,
  "reasoning": "detailed committee decision reasoning...",
  "keyRisks": ["string"]
}

Do not include markdown formatting, explanations, or code blocks in your final output. Return ONLY valid JSON.`;

  let responseText = "";
  try {
    console.log(`[Portfolio Committee Agent] Querying Gemini for final portfolio vetting (Attempt 1)...`);
    const response = await model.invoke(prompt);
    responseText = response.content;

    const cleanedText = cleanResponseText(responseText);
    const parsedData = JSON.parse(cleanedText);
    const validatedData = portfolioCommitteeSchema.parse(parsedData);
    return validatedData;
  } catch (err) {
    console.warn(`[Portfolio Committee Agent] Attempt 1 failed: ${err.message}. Retrying...`);
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
      const validatedRetryData = portfolioCommitteeSchema.parse(parsedRetryData);
      return validatedRetryData;
    } catch (retryErr) {
      console.error(`[Portfolio Committee Agent] Both attempts failed: ${retryErr.message}`);
      throw new Error(`Portfolio committee agent execution failed: ${retryErr.message}`);
    }
  }
};
