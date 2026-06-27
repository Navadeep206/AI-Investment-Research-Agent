import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

process.env.MOCK_LLM = 'true';

import prisma from '../config/prisma.js';
import cacheService from '../services/cacheService.js';
import analysisService from '../services/analysisService.js';

async function run() {
  const company = "NVIDIA Corporation";
  
  // Clean up
  await prisma.analysis.deleteMany({ where: { company } });
  await prisma.evidenceCache.deleteMany({ where: { companyName: company } });

  const mockEvidencePayload = {
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
    evidence: [
      {
        claim: "NVIDIA has a strong GPU lineup for AI and CUDA software platform creates lock-in.",
        source: "Bloomberg",
        url: "https://bloomberg.com/news/1",
        confidence: 90,
        publishedTime: new Date().toISOString()
      }
    ],
    evidenceMetrics: {
      totalSources: 1,
      tierA: 1,
      tierB: 0,
      tierC: 0,
      tierD: 0,
      averageConfidence: 90,
      evidenceQualityScore: 83
    }
  };

  // 1. Save to Cache
  console.log("=== STEP 1: Saving mock evidence to cache ===");
  await cacheService.saveEvidenceToCache(company, mockEvidencePayload);

  // 2. Run analysis using cache
  console.log("\n=== STEP 2: Running analysis with cache hit ===");
  const executeWorkflow = async (resolvedName, preFetchedData = null) => {
    return await analysisService.runFullAnalysisAndSave(resolvedName, preFetchedData, "session-test-123", "REQ-CACHE-123");
  };

  const result = await cacheService.getOrRefreshAnalysis(company, executeWorkflow, "session-test-123", false);

  console.log("\n=== STEP 3: Querying saved analysis from DB ===");
  const dbRecord = await prisma.analysis.findUnique({
    where: { id: result.analysisId }
  });

  console.log("Top Level evidenceQualityScore:", dbRecord.evidenceQualityScore);
  console.log("finalDecision.evidenceQualityScore:", dbRecord.finalDecision?.evidenceQualityScore);
  console.log("confidenceBreakdown.evidenceQuality:", dbRecord.confidenceBreakdown?.evidenceQuality);

  // Clean up
  await prisma.analysis.deleteMany({ where: { company } });
  await prisma.evidenceCache.deleteMany({ where: { companyName: company } });
}

run().catch(console.error).finally(() => prisma.$disconnect());
