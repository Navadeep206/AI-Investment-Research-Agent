import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

process.env.MOCK_LLM = 'true';

import { investmentGraph } from './graph/investmentGraph.js';

async function test() {
  const result = await investmentGraph.invoke({
    company: "Apple Inc.",
    requestId: "REQ-TEST-123"
  });
  console.log("Graph Result keys:", Object.keys(result));
  console.log("evidenceMetrics in result:", result.evidenceMetrics);
  console.log("finalDecision in result:", result.finalDecision);
}

test().catch(console.error);
