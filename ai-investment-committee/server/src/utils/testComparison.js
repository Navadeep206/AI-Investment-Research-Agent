import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Enforce MOCK_LLM mode for fast verification
process.env.MOCK_LLM = 'true';

import { compareCompanies } from '../controllers/comparisonController.js';
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
  console.log("=== STARTING COMPANY COMPARISON VERIFICATION ===");

  console.log("\n=== TEST 1: Comparing 'NVIDIA' and 'Microsoft' ===");
  const req1 = {
    body: {
      companyA: "NVIDIA",
      companyB: "Microsoft"
    }
  };
  const res1 = mockResponse();
  await compareCompanies(req1, res1, (err) => {
    console.error("Comparison route Express next() error in Test 1:", err);
  });
  console.log("Status Code:", res1.statusCode || 200);
  console.log("Return JSON Payload:\n", JSON.stringify(res1.body, null, 2));

  console.log("\n=== TEST 2: Comparing 'AMD' and 'NVIDIA' ===");
  const req2 = {
    body: {
      companyA: "AMD",
      companyB: "NVIDIA"
    }
  };
  const res2 = mockResponse();
  await compareCompanies(req2, res2, (err) => {
    console.error("Comparison route Express next() error in Test 2:", err);
  });
  console.log("Status Code:", res2.statusCode || 200);
  console.log("Return JSON Payload:\n", JSON.stringify(res2.body, null, 2));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
