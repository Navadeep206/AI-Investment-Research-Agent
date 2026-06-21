import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import evidenceService from './services/evidenceService.js';
import companyResearchService from './services/companyResearchService.js';
import { runResearchAgent } from './agents/researchAgent.js';
import { runScoringAgent } from './agents/scoringAgent.js';
import { runDevilAdvocateAgent } from './agents/devilAdvocateAgent.js';
import { runCommitteeAgent } from './agents/committeeAgent.js';
import { getResearchPrompt } from './prompts/researchPrompt.js';
import sourceRankingService from './services/sourceRankingService.js';

async function test() {
  const company = "NVIDIA";
  console.log("=== 1. COLLECTING EVIDENCE ===");
  const rawEvidence = await evidenceService.collectEvidence(company);
  const { rankedEvidence, metrics } = sourceRankingService.rankEvidence(rawEvidence);
  console.log(JSON.stringify(rankedEvidence, null, 2));
  console.log("Metrics:", JSON.stringify(metrics, null, 2));

  console.log("\n=== 2. UPDATED RESEARCH AGENT PROMPT ===");
  const companyData = await companyResearchService.getCompanyResearch(company);
  const prompt = getResearchPrompt(companyData, rankedEvidence);
  console.log(prompt);

  console.log("\n=== 3. RUNNING AGENTS FOR COMMITTEE OUTPUT ===");
  const research = await runResearchAgent(companyData, rankedEvidence);
  const scorecard = await runScoringAgent(company, research);
  const challenge = await runDevilAdvocateAgent(company, research, scorecard);
  const committee = await runCommitteeAgent(research, scorecard, challenge, rankedEvidence.length, metrics);
  console.log(JSON.stringify(committee, null, 2));
}

test().catch(console.error);
