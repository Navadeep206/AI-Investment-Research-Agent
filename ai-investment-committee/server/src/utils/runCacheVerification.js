import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
process.env.MOCK_LLM = 'true';

import { analyzeCompany } from '../controllers/analysisController.js';
import prisma from '../config/prisma.js';

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
  console.log("=== PRE-CLEANING AMD RECORDS ===");
  await prisma.analysis.deleteMany({
    where: {
      OR: [
        {
          company: {
            contains: 'Advanced Micro Devices',
            mode: 'insensitive'
          }
        },
        {
          company: {
            contains: 'AMD',
            mode: 'insensitive'
          }
        }
      ]
    }
  });
  console.log("Cleanup complete.");

  console.log("\n=== VERIFICATION 1: CACHE MISS (FIRST REQUEST) ===");
  const req1 = { body: { company: "AMD" } };
  const res1 = mockResponse();
  
  // Running workflow (will execute full LangGraph chain)
  await analyzeCompany(req1, res1, (err) => {
    console.error("Express next error called:", err);
  });
  
  console.log("Response 1:", JSON.stringify(res1.body, null, 2));

  console.log("\n=== VERIFICATION 2: CACHE HIT (SECOND REQUEST) ===");
  const req2 = { body: { company: "AMD" } };
  const res2 = mockResponse();
  
  // Running second check (should trigger cache hit)
  await analyzeCompany(req2, res2, (err) => {
    console.error("Express next error called:", err);
  });
  
  console.log("Response 2:", JSON.stringify(res2.body, null, 2));

  console.log("\n=== VERIFICATION 3: DATABASE HISTORY ===");
  const { getHistory } = await import('../controllers/historyController.js');
  const req3 = {};
  const res3 = mockResponse();
  await getHistory(req3, res3, (err) => console.error("History err:", err));
  console.log("Latest history records:", JSON.stringify(res3.body?.history?.slice(0, 3), null, 2));

  console.log("\n=== VERIFICATION 4: CACHE STATS ===");
  const { getStats } = await import('../controllers/cacheController.js');
  const req4 = {};
  const res4 = mockResponse();
  await getStats(req4, res4, (err) => console.error("Stats err:", err));
  console.log("Cache stats:", JSON.stringify(res4.body, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
