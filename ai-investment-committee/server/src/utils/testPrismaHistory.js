import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import analysisService from '../services/analysisService.js';

async function test() {
  console.log("=== NEON DB CONNECTION SUCCESS CHECK ===");
  
  // 1. Save a mock analysis
  const saved = await analysisService.saveAnalysis({
    company: "NVIDIA",
    industry: "Semiconductors",
    marketCap: "$5.10T",
    overallScore: 92,
    recommendation: "INVEST",
    confidence: 92,
    sourcesUsed: 10,
    evidenceQualityScore: 88,
    research: {
      businessOverview: "NVIDIA is the leading developer of GPU systems for AI.",
      revenueDrivers: ["Blackwell chip volume", "CUDA ecosystem adoption"],
      competitiveAdvantages: ["Early entry", "CUDA dev lock-in"],
      growthCatalysts: ["Agentic AI inflection"],
      risks: ["Geopolitical chip supply chain friction"],
      bullCase: "Strong leader in data center computing."
    },
    scorecard: {
      businessQuality: 92,
      growthPotential: 90,
      overallScore: 92,
      recommendation: "INVEST"
    },
    challenge: {
      bearCase: "Valuation pricing has minimal margin for error.",
      keyConcerns: ["Customer chip insourcing"],
      hiddenRisks: ["Geopolitical supply chain disruption"],
      worstCaseScenario: "Competitor custom ASIC erosion",
      counterArguments: ["High switching costs for CUDA developers"]
    },
    finalDecision: {
      recommendation: "INVEST",
      confidence: 92,
      reasoning: "The committee voted to INVEST based on robust CUDA developer lock-in.",
      keyFactors: ["CUDA lock-in"],
      sourcesUsed: 10,
      evidenceQualityScore: 88,
      decisionOverrideReason: null
    }
  });
  console.log("Database write succeeded! Saved object ID:", saved.id);
  console.log("Saved Analysis Object:\n", JSON.stringify(saved, null, 2));

  // 2. Fetch history (corresponds to GET /api/history output)
  console.log("\n=== RESULT: GET /api/history ===");
  const history = await analysisService.getAnalysisHistory();
  console.log(JSON.stringify(history, null, 2));
}

test().catch(console.error);
