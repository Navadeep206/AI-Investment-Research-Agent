/**
 * Prompt template configuration for the Investment Scoring Agent.
 */
export const getScoringPrompt = (companyName, researchReport) => {
  return `You are a senior investment committee director.
Evaluate the equity research report supplied below for "${companyName}" and compile a standardized scorecard.

Research Report Data:
${JSON.stringify(researchReport, null, 2)}

SCORING GUIDELINES:
1. Business Quality (0-100): Score the resilience of the company's operating model, market position, and management.
2. Growth Potential (0-100): Score the growth vectors, catalyst strength, and industry market expansion prospects.
3. Competitive Moat (0-100): Score the switching costs, patents, brand equity, or network effect moats.
4. Financial Strength (0-100): Score financial resilience, cash flow generation capacity, and leverage safety.
5. Risk Level (0-100): Score potential downside risks, competitive threats, and regulatory headwinds (where 0 is no risk, and 100 is high critical risk).
6. Overall Score (0-100): Formulate the overall quality grade of the company.
7. Confidence (0-100): Assess your level of confidence in this scoring model based on the available data.
8. Recommendation (INVEST, WATCH, or PASS):
   - You MUST assign the recommendation based on the Overall Score according to the following strict boundaries:
     * Overall Score >= 80  →  "INVEST"
     * Overall Score >= 60 and < 80  →  "WATCH"
     * Overall Score < 60  →  "PASS"

INSTRUCTIONS:
- Return ONLY a valid JSON object matching the required schema.
- Do NOT wrap the response in markdown blocks (no \`\`\`json ... \`\`\`).
- Do NOT include any explanations, markdown annotations, introductory words, or footnotes. Return ONLY the raw JSON string.

REQUIRED JSON FORMAT SCHEMA:
{
  "businessQuality": 85,
  "growthPotential": 75,
  "competitiveMoat": 90,
  "financialStrength": 80,
  "riskLevel": 35,
  "overallScore": 82,
  "confidence": 90,
  "recommendation": "INVEST"
}
`;
};
