/**
 * Prompt template configuration for the Company Comparison Engine.
 */
export const getComparisonPrompt = (companyA, companyB, analysisA, analysisB) => {
  return `You are a principal investment partner comparing two target companies.
Compare the two investment analyses provided below side-by-side:

---
COMPANY A: "${companyA}"
Full Analysis Report:
${JSON.stringify(analysisA, null, 2)}

---
COMPANY B: "${companyB}"
Full Analysis Report:
${JSON.stringify(analysisB, null, 2)}

---

COMPARISON DIRECTIVES:
1. Synthesize the findings for both companies across all domains (Business Quality, Growth Potential, Competitive Moat, Financial Strength, Risk Level, and Overall Score).
2. Generate:
   - "summary": A concise comparative summary emphasizing core differences in competitive positioning, growth dynamics, and risk profiles. Look at who wins where (e.g. "Company A wins on growth and moat, while Company B wins on diversification and risk management"). Keep it under 3-4 sentences.
   - "insights":
     - "strengthsA": List of 2 to 4 major strengths for Company A.
     - "strengthsB": List of 2 to 4 major strengths for Company B.
     - "weaknessesA": List of 1 to 3 major weaknesses for Company A.
     - "weaknessesB": List of 1 to 3 major weaknesses for Company B.

INSTRUCTIONS:
- Return ONLY a valid JSON object matching the required schema.
- Do NOT wrap your response in markdown blocks (do not output \`\`\`json ... \`\`\`).
- Do NOT output any introductory text, footnotes, summaries, or explanations. Return ONLY the raw JSON string.

REQUIRED JSON FORMAT SCHEMA:
{
  "summary": "AI comparative summary text...",
  "insights": {
    "strengthsA": [
      "Strength 1...",
      "Strength 2..."
    ],
    "strengthsB": [
      "Strength 1...",
      "Strength 2..."
    ],
    "weaknessesA": [
      "Weakness 1...",
      "Weakness 2..."
    ],
    "weaknessesB": [
      "Weakness 1...",
      "Weakness 2..."
    ]
  }
}
`;
};
