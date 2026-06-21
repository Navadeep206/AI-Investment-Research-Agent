import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import cacheService from '../services/cacheService.js';
import prisma from '../config/prisma.js';

async function test() {
  const company = "TestCacheCompany";
  console.log("=== 1. PRE-CLEAN TEST COMPANY RECORD ===");
  await prisma.analysis.deleteMany({
    where: {
      company: {
        equals: company,
        mode: 'insensitive'
      }
    }
  });

  console.log("\n=== 2. RUN getOrRefreshAnalysis FOR MISS ===");
  // Simulate workflow run
  const mockWorkflow = async () => {
    console.log("[Mock Workflow] Generating fresh analysis...");
    const saved = await prisma.analysis.create({
      data: {
        company: company,
        industry: "Testing",
        research: {},
        scorecard: {},
        challenge: {},
        finalDecision: {}
      }
    });
    return {
      analysisId: saved.id,
      company: saved.company,
      createdAt: saved.createdAt,
      analysis: {
        research: saved.research,
        scorecard: saved.scorecard,
        challenge: saved.challenge,
        finalDecision: saved.finalDecision
      }
    };
  };

  const missResult = await cacheService.getOrRefreshAnalysis(company, mockWorkflow);
  console.log("Miss Output:\n", JSON.stringify(missResult, null, 2));

  console.log("\n=== 3. RUN getOrRefreshAnalysis FOR HIT ===");
  const hitResult = await cacheService.getOrRefreshAnalysis(company, mockWorkflow);
  console.log("Hit Output:\n", JSON.stringify(hitResult, null, 2));

  console.log("\n=== 4. GET CACHE HEALTH STATS ===");
  const stats = await cacheService.getCacheStats();
  console.log("Stats Output:\n", JSON.stringify(stats, null, 2));

  // Clean up
  console.log("\n=== 5. CLEAN UP ===");
  await prisma.analysis.deleteMany({
    where: {
      company: {
        equals: company,
        mode: 'insensitive'
      }
    }
  });
  console.log("Clean up successful!");
}

test().catch(console.error).finally(() => prisma.$disconnect());
