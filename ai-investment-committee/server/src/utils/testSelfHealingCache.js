import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Enforce Mock mode for fast testing
process.env.MOCK_LLM = 'true';

import prisma from '../config/prisma.js';
import cacheService from '../services/cacheService.js';
import { analyzeCompany } from '../controllers/analysisController.js';
import { compareCompanies } from '../controllers/comparisonController.js';
import { getStats } from '../controllers/cacheController.js';

// Helper to mock Express response object
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

async function testFlow() {
  console.log("=== STARTING SELF-HEALING CACHE VERIFICATION ===\n");

  // Step 1: Pre-clean NVIDIA and Microsoft records
  console.log("1. Cleaning up database records for NVIDIA and Microsoft...");
  await prisma.analysis.deleteMany({
    where: {
      company: {
        in: ["NVIDIA", "NVIDIA Corporation", "Microsoft", "Microsoft Corporation"],
        mode: 'insensitive'
      }
    }
  });
  console.log("Cleanup finished.");

  // Reset in-memory stats
  cacheService.cacheHits = 0;
  cacheService.cacheMisses = 0;
  cacheService.cacheRepairs = 0;

  // Step 2: Insert a fresh but INCOMPLETE NVIDIA analysis (dataQuality = 40)
  console.log("\n2. Inserting a fresh but INCOMPLETE NVIDIA record (dataQuality = 40)...");
  const incompleteNvidia = await prisma.analysis.create({
    data: {
      company: "NVIDIA",
      scorecard: {
        businessQuality: 40 // Only 1 scorecard field present, missing growthPotential, competitiveMoat, etc.
      },
      research: {},
      challenge: {},
      finalDecision: {},
      createdAt: new Date() // Fresh (age < 24 hours)
    }
  });
  console.log(`Incomplete NVIDIA inserted. ID: ${incompleteNvidia.id}`);

  // Calculate quality via helper to verify
  const isCompletePre = cacheService.isAnalysisComplete(incompleteNvidia);
  console.log(`Is incomplete NVIDIA complete? ${isCompletePre} (Expected: false)`);

  // Step 3: Call POST /api/analyze for NVIDIA. It should trigger CACHE_REPAIRED and incomplete_cache
  console.log("\n3. Testing Cache Repair via POST /api/analyze for NVIDIA...");
  const req1 = { body: { company: "NVIDIA" } };
  const res1 = mockResponse();
  await analyzeCompany(req1, res1, (err) => {
    console.error("Express next() error:", err);
  });

  console.log("Status Code:", res1.statusCode || 200);
  console.log("Response Payload (Repair):");
  console.log(JSON.stringify({
    dataSource: res1.body?.dataSource,
    cacheReason: res1.body?.cacheReason,
    company: res1.body?.company,
    analysisId: res1.body?.analysisId,
    scorecard: res1.body?.analysis?.scorecard
  }, null, 2));

  if (res1.body?.dataSource !== "CACHE_REPAIRED" || res1.body?.cacheReason !== "incomplete_cache") {
    throw new Error(`Invalid repair response: ${res1.body?.dataSource} / ${res1.body?.cacheReason}`);
  }
  console.log("✅ Cache Repair verified successfully!");

  // Step 4: Call POST /api/analyze for NVIDIA again. It should now HIT the cache
  console.log("\n4. Testing Cache Hit (Second Request) via POST /api/analyze for NVIDIA...");
  const req2 = { body: { company: "NVIDIA" } };
  const res2 = mockResponse();
  await analyzeCompany(req2, res2, (err) => {
    console.error("Express next() error:", err);
  });

  console.log("Status Code:", res2.statusCode || 200);
  console.log("Response Payload (Hit):");
  console.log(JSON.stringify({
    dataSource: res2.body?.dataSource,
    cacheReason: res2.body?.cacheReason,
    company: res2.body?.company,
    analysisId: res2.body?.analysisId,
    scorecard: res2.body?.analysis?.scorecard
  }, null, 2));

  if (res2.body?.dataSource !== "CACHE" || res2.body?.cacheReason !== "fresh_cache") {
    throw new Error(`Invalid hit response: ${res2.body?.dataSource} / ${res2.body?.cacheReason}`);
  }
  console.log("✅ Cache Hit verified successfully!");

  // Step 5: Test Cache Repair inside the comparison engine.
  // Insert an incomplete Microsoft record
  console.log("\n5. Inserting a fresh but INCOMPLETE Microsoft record...");
  const incompleteMsft = await prisma.analysis.create({
    data: {
      company: "Microsoft",
      scorecard: {
        businessQuality: 50
      },
      research: {},
      challenge: {},
      finalDecision: {},
      createdAt: new Date()
    }
  });
  console.log(`Incomplete Microsoft inserted. ID: ${incompleteMsft.id}`);

  console.log("\n6. Comparing NVIDIA (repaired/complete) and Microsoft (incomplete/triggers repair)...");
  const req3 = {
    body: {
      companyA: "NVIDIA",
      companyB: "Microsoft"
    }
  };
  const res3 = mockResponse();
  await compareCompanies(req3, res3, (err) => {
    console.error("Express next() error during comparison:", err);
  });

  console.log("Status Code:", res3.statusCode || 200);
  console.log("Response Payload (Comparison):");
  console.log(JSON.stringify({
    success: res3.body?.success,
    companyA: res3.body?.companyA,
    companyB: res3.body?.companyB,
    dataQuality: res3.body?.dataQuality,
    winner: res3.body?.comparison?.winner,
    warning: res3.body?.comparison?.warning,
    recommendation: res3.body?.comparison?.recommendation,
    rationale: res3.body?.comparison?.rationale
  }, null, 2));

  if (res3.body?.dataQuality?.companyA !== 100 || res3.body?.dataQuality?.companyB !== 100) {
    throw new Error(`Expected both data qualities to be 100 after repair. Got: ${JSON.stringify(res3.body?.dataQuality)}`);
  }
  console.log("✅ Comparison Auto-Repair verified successfully!");

  // Step 6: Verify cache stats tracking
  console.log("\n7. Verifying Cache Stats API...");
  const req4 = {};
  const res4 = mockResponse();
  await getStats(req4, res4, (err) => {
    console.error("Express next() error during stats:", err);
  });

  console.log("Stats Response Payload:");
  console.log(JSON.stringify(res4.body?.stats, null, 2));

  console.log("\nAll Self-Healing Cache verification assertions PASSED successfully!");
}

testFlow()
  .catch((err) => {
    console.error("\n❌ Verification Failed:", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
