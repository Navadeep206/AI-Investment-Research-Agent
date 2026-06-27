import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

process.env.MOCK_LLM = 'true';

import sourceRankingService from './services/sourceRankingService.js';
import { investmentGraph } from './graph/investmentGraph.js';
import analysisService from './services/analysisService.js';

async function test() {
  // Mock 3 evidence items to produce a non-zero evidenceQualityScore
  const mockEvidenceList = [
    {
      claim: "NVIDIA has a strong GPU lineup for AI and CUDA software platform creates lock-in.",
      source: "Bloomberg",
      url: "https://bloomberg.com/news/1",
      confidence: 90,
      publishedTime: new Date().toISOString()
    },
    {
      claim: "Geopolitical tensions pose risks to TSMC's manufacturing pipeline for chips.",
      source: "Reuters",
      url: "https://reuters.com/news/2",
      confidence: 85,
      publishedTime: new Date().toISOString()
    },
    {
      claim: "NVIDIA dominates generative AI hardware space with Hopper and Blackwell platforms.",
      source: "TechCrunch",
      url: "https://techcrunch.com/news/3",
      confidence: 80,
      publishedTime: new Date().toISOString()
    }
  ];

  console.log("=== STEP 1: Evidence Engine (sourceRankingService) ===");
  const { rankedEvidence, metrics } = sourceRankingService.rankEvidence(mockEvidenceList);
  console.log("Calculated metrics:", metrics);
  const score = metrics.evidenceQualityScore;
  console.log("Evidence Engine Output Score:", score);

  console.log("\n=== STEP 2: Graph Execution ===");
  const result = await investmentGraph.invoke({
    company: "NVIDIA Corporation",
    companyData: {
      company: "NVIDIA Corporation",
      industry: "Semiconductors",
      marketCap: "$3.2T",
      description: "NVIDIA develops GPU hardware and CUDA software.",
      website: "https://nvidia.com",
      headquarters: "Santa Clara, CA",
      employees: 40000,
      source: "Mocked"
    },
    evidence: rankedEvidence,
    evidenceMetrics: metrics,
    requestId: "REQ-TRACE-123"
  });

  console.log("Graph Output evidenceMetrics score:", result.evidenceMetrics?.evidenceQualityScore);
  console.log("Graph Output finalDecision score:", result.finalDecision?.evidenceQualityScore);

  console.log("\n=== STEP 3: Analysis Service Save ===");
  const savedResult = await analysisService.runFullAnalysisAndSave(
    "NVIDIA Corporation",
    {
      companyData: result.companyData,
      evidence: result.evidence,
      evidenceMetrics: result.evidenceMetrics
    },
    "session-trace-123",
    "REQ-TRACE-123",
    null
  );

  console.log("Saved database record ID:", savedResult.analysisId);

  const dbRecord = await analysisService.getAnalysisById(savedResult.analysisId);
  console.log("Retrieved from DB - Top Level evidenceQualityScore:", dbRecord.evidenceQualityScore);
  console.log("Retrieved from DB - finalDecision.evidenceQualityScore:", dbRecord.finalDecision?.evidenceQualityScore);
  console.log("Retrieved from DB - confidenceBreakdown.evidenceQuality:", dbRecord.confidenceBreakdown?.evidenceQuality);

  // Clean up
  await analysisService.deleteAnalysis(savedResult.analysisId);
}

test().catch(console.error);
