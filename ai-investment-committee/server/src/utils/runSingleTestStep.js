import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Save original methods
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import companyResearchService from '../services/companyResearchService.js';
import evidenceService from '../services/evidenceService.js';
import cacheService from '../services/cacheService.js';
import analysisService from '../services/analysisService.js';
import prisma from '../config/prisma.js';

let geminiCalls = 0;
let wikipediaCalls = 0;
let yahooCalls = 0;
let tavilyCalls = 0;

// Monkey-patch invoke
const originalInvoke = ChatGoogleGenerativeAI.prototype.invoke;
ChatGoogleGenerativeAI.prototype.invoke = async function(...args) {
  geminiCalls++;
  return originalInvoke.apply(this, args);
};

// Monkey-patch Wikipedia
const originalWiki = companyResearchService.fetchWikipediaSummary;
companyResearchService.fetchWikipediaSummary = async function(...args) {
  wikipediaCalls++;
  return originalWiki.apply(this, args);
};

// Monkey-patch Yahoo
const originalYahoo = companyResearchService.fetchMarketData;
companyResearchService.fetchMarketData = async function(...args) {
  yahooCalls++;
  return originalYahoo.apply(this, args);
};

// Monkey-patch Tavily
const originalTavily = evidenceService.collectEvidence;
evidenceService.collectEvidence = async function(...args) {
  tavilyCalls++;
  return originalTavily.apply(this, args);
};

async function execute() {
  const company = process.argv[2] || "Microsoft";
  const forceRefresh = process.argv[3] === "true";

  const startTime = Date.now();

  // Look up cache
  const cachedEvidence = await cacheService.getEvidence(company, forceRefresh);
  let result;
  let dataSource;

  if (cachedEvidence) {
    result = await analysisService.runFullAnalysisAndSave(cachedEvidence.companyName, cachedEvidence.normalizedEvidence, null, "REQ-VAL-HIT");
    dataSource = "CACHE";
  } else {
    result = await analysisService.runFullAnalysisAndSave(company, null, null, "REQ-VAL-MISS");
    dataSource = "LIVE";
  }

  const durationMs = Date.now() - startTime;

  // Retrieve details
  const formatted = await analysisService.getAnalysisById(result.analysisId);
  const cacheRecord = await cacheService.findCachedEvidenceRecord(formatted.company);

  console.log("===JSON_START===");
  console.log(JSON.stringify({
    success: true,
    company: formatted.company,
    analysisId: formatted.id,
    evidenceCacheId: cacheRecord ? cacheRecord.id : null,
    dataSource: dataSource,
    durationMs,
    counts: {
      geminiCalls,
      wikipediaCalls,
      yahooCalls,
      tavilyCalls
    },
    analysis: {
      research: formatted.research,
      scorecard: formatted.scorecard,
      challenge: formatted.challenge,
      finalDecision: formatted.finalDecision
    }
  }, null, 2));
  console.log("===JSON_END===");
}

execute()
  .catch(err => {
    console.log("===JSON_START===");
    console.log(JSON.stringify({ success: false, error: err.message, stack: err.stack }));
    console.log("===JSON_END===");
  })
  .finally(() => prisma.$disconnect());
