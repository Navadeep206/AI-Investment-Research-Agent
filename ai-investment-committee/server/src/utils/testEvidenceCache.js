import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
process.env.MOCK_LLM = 'true'; // Fast mocked verification

import prisma from '../config/prisma.js';
import cacheService from '../services/cacheService.js';
import { analyzeCompany } from '../controllers/analysisController.js';

const mockResponse = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

async function run() {
  const companyQuery = "Microsoft";
  console.log("=== STARTING EVIDENCE CACHE VERIFICATION ===");

  // 1. Clean up existing records
  console.log("\n1. Cleaning up existing database records...");
  await prisma.evidenceCache.deleteMany({
    where: {
      companyName: {
        contains: companyQuery,
        mode: 'insensitive'
      }
    }
  });
  await prisma.analysis.deleteMany({
    where: {
      company: {
        contains: companyQuery,
        mode: 'insensitive'
      }
    }
  });
  console.log("Cleanup finished.");

  // Reset cache hits/misses
  cacheService.cacheHits = 0;
  cacheService.cacheMisses = 0;

  // 2. FIRST RUN - Expected: Cache Miss (LIVE evidence gathering + Agent execution)
  console.log("\n2. RUNNING FIRST REQUEST (Expected: LIVE evidence gathering + Agent execution)");
  const req1 = { body: { company: companyQuery } };
  const res1 = mockResponse();
  await analyzeCompany(req1, res1, (err) => console.error("Express err:", err));

  console.log("First Request Result:");
  console.log(`- Data Source: ${res1.body?.dataSource}`);
  console.log(`- Cache Reason: ${res1.body?.cacheReason}`);
  console.log(`- Analysis ID: ${res1.body?.analysisId}`);
  
  if (res1.body?.dataSource !== "FRESH_ANALYSIS") {
    throw new Error(`Expected FRESH_ANALYSIS on first run, got ${res1.body?.dataSource}`);
  }

  // Verify that EvidenceCache now has a record for Microsoft
  const evidenceRecord = await prisma.evidenceCache.findFirst({
    where: { companyName: { contains: companyQuery, mode: 'insensitive' } }
  });
  if (!evidenceRecord) {
    throw new Error("EvidenceCache record was not created on the first run!");
  }
  console.log("✓ Evidence Cache record created in DB successfully.");
  console.log("Cached company name in DB:", evidenceRecord.companyName);

  // 3. SECOND RUN - Expected: Cache Hit (CACHE evidence loaded + Agents executed AGAIN)
  console.log("\n3. RUNNING SECOND REQUEST (Expected: CACHE evidence loaded + Agent execution again)");
  const req2 = { body: { company: companyQuery } };
  const res2 = mockResponse();
  await analyzeCompany(req2, res2, (err) => console.error("Express err:", err));

  console.log("Second Request Result:");
  console.log(`- Data Source: ${res2.body?.dataSource}`);
  console.log(`- Cache Reason: ${res2.body?.cacheReason}`);
  console.log(`- Analysis ID: ${res2.body?.analysisId}`);

  if (res2.body?.dataSource !== "CACHE") {
    throw new Error(`Expected CACHE on second run, got ${res2.body?.dataSource}`);
  }

  if (res1.body?.analysisId === res2.body?.analysisId) {
    throw new Error("Design flaw: Second request returned the same analysis ID!");
  }
  console.log("✓ Success: Second request generated a fresh analysis (New Analysis ID:", res2.body?.analysisId, ").");

  // 4. VERIFY AGENT EXECUTION METRICS
  const dbRow1 = await prisma.analysis.findUnique({ where: { id: res1.body?.analysisId } });
  const dbRow2 = await prisma.analysis.findUnique({ where: { id: res2.body?.analysisId } });

  console.log("\n4. Agent Metrics Verification:");
  console.log("First Run Agent Metrics:", JSON.stringify(dbRow1.agentMetrics));
  console.log("Second Run Agent Metrics:", JSON.stringify(dbRow2.agentMetrics));

  if (!dbRow1.agentMetrics || !dbRow2.agentMetrics) {
    throw new Error("Agent metrics missing in database!");
  }
  console.log("✓ Success: Both runs executed and recorded agent performance metrics.");

  console.log("\n5. CACHE STATS");
  const stats = await cacheService.getCacheStats();
  console.log("Cache Stats:", JSON.stringify(stats, null, 2));

  console.log("\n=========================================");
  console.log("ALL EVIDENCE CACHE TESTS PASSED SUCCESSFULLY!");
  console.log("=========================================");
}

run()
  .catch((err) => {
    console.error("\n❌ Verification Failed:", err.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
