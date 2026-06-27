import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { runResearchAgent } from "../agents/researchAgent.js";
import { runScoringAgent } from "../agents/scoringAgent.js";
import { runDevilAdvocateAgent } from "../agents/devilAdvocateAgent.js";
import { runCommitteeAgent } from "../agents/committeeAgent.js";
import executionTracker from "../services/executionTracker.js";

// Define the GraphState Annotation structure
const GraphState = Annotation.Root({
  company: Annotation({
    reducer: (x, y) => y ?? x,
  }),
  companyData: Annotation({
    reducer: (x, y) => y ?? x,
  }),
  evidence: Annotation({
    reducer: (x, y) => y ?? x,
  }),
  evidenceMetrics: Annotation({
    reducer: (x, y) => y ?? x,
  }),
  research: Annotation({
    reducer: (x, y) => y ?? x,
  }),
  scorecard: Annotation({
    reducer: (x, y) => y ?? x,
  }),
  challenge: Annotation({
    reducer: (x, y) => y ?? x,
  }),
  finalDecision: Annotation({
    reducer: (x, y) => y ?? x,
  }),
  sessionId: Annotation({
    reducer: (x, y) => y ?? x,
  }),
  requestId: Annotation({
    reducer: (x, y) => y ?? x,
  }),
  agentMetrics: Annotation({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({
      researchMs: 0,
      scoringMs: 0,
      devilMs: 0,
      committeeMs: 0,
      totalMs: 0
    })
  })
});

const evidenceNode = async (state) => {
  const reqId = state.requestId || 'N/A';
  console.log(`[Evidence Service] [${reqId}] Running Evidence Collection Node...`);

  if (state.companyData && state.evidence && state.evidenceMetrics) {
    console.log(`[Evidence Service] [${reqId}] Reusing cached/pre-provided evidence and companyData for "${state.company}".`);
    console.log("Evidence Service Output (Cached)", state.evidenceMetrics.evidenceQualityScore);
    return {
      companyData: state.companyData,
      company: state.company,
      evidence: state.evidence,
      evidenceMetrics: state.evidenceMetrics,
    };
  }

  const { default: evidenceService } = await import('../services/evidenceService.js');
  const { default: sourceRankingService } = await import('../services/sourceRankingService.js');
  const { default: companyResearchService } = await import('../services/companyResearchService.js');
  const { default: cacheService } = await import('../services/cacheService.js');

  // Gather Wikipedia & Yahoo Finance data and Tavily search in parallel to optimize latency
  const [companyData, evidenceData] = await Promise.all([
    companyResearchService.getCompanyResearch(state.company),
    evidenceService.collectEvidence(state.company)
  ]);

  const { rankedEvidence, metrics } = sourceRankingService.rankEvidence(evidenceData);
  const normalizedCompany = companyData.company;

  try {
    await cacheService.saveEvidenceToCache(normalizedCompany, {
      companyData,
      evidence: rankedEvidence,
      evidenceMetrics: metrics
    });
  } catch (err) {
    console.error(`[Evidence Service] [${reqId}] Failed to save evidence to cache for "${normalizedCompany}":`, err.message);
  }

  console.log("Evidence Service Output", metrics.evidenceQualityScore);
  return {
    companyData,
    company: normalizedCompany, // Normalize company name
    evidence: rankedEvidence,
    evidenceMetrics: metrics,
  };
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const researchNode = async (state) => {
  const reqId = state.requestId || 'N/A';
  console.log(`[Research Agent] [${reqId}] Running Research Node...`);
  console.log("Research Agent Input Score", state.evidenceMetrics ? state.evidenceMetrics.evidenceQualityScore : "N/A");
  if (!state.companyData) {
    throw new Error("Missing companyData in graph state");
  }
  const sessionId = state.sessionId;
  if (sessionId) {
    executionTracker.startAgent(sessionId, "Research Agent");
  }

  const startTime = Date.now();
  const result = await runResearchAgent(state.companyData, state.evidence);
  const durationMs = Date.now() - startTime;

  if (sessionId) {
    executionTracker.completeAgent(sessionId, "Research Agent", "Generated company investment report.");
  }

  return { 
    research: result,
    agentMetrics: { researchMs: durationMs }
  };
};

const scoringNode = async (state) => {
  const reqId = state.requestId || 'N/A';
  console.log(`[Scoring Agent] [${reqId}] Pacing call and running Scoring Node...`);
  console.log("Scoring Agent Input Score", state.evidenceMetrics ? state.evidenceMetrics.evidenceQualityScore : "N/A");
  await sleep(1500); // Prevent 429/503 on Free Tier API keys by pacing requests
  if (!state.company || !state.research) {
    throw new Error("Missing company name or research report in graph state");
  }
  const sessionId = state.sessionId;
  if (sessionId) {
    executionTracker.startAgent(sessionId, "Scoring Agent");
  }

  const startTime = Date.now();
  const result = await runScoringAgent(state.company, state.research);
  const durationMs = Date.now() - startTime;

  if (sessionId) {
    executionTracker.completeAgent(sessionId, "Scoring Agent", "Calculated investment scorecard.");
  }

  return { 
    scorecard: result,
    agentMetrics: { scoringMs: durationMs }
  };
};

const devilAdvocateNode = async (state) => {
  const reqId = state.requestId || 'N/A';
  console.log(`[Devil's Advocate] [${reqId}] Pacing call and running Devil's Advocate Node...`);
  await sleep(1500); // Prevent 429/503 on Free Tier API keys by pacing requests
  if (!state.company || !state.research || !state.scorecard) {
    throw new Error("Missing company name, research, or scorecard in graph state");
  }
  const sessionId = state.sessionId;
  if (sessionId) {
    executionTracker.startAgent(sessionId, "Devil Advocate Agent");
  }

  const startTime = Date.now();
  const result = await runDevilAdvocateAgent(state.company, state.research, state.scorecard);
  const durationMs = Date.now() - startTime;

  if (sessionId) {
    executionTracker.completeAgent(sessionId, "Devil Advocate Agent", "Generated bear case and risk analysis.");
  }

  return { 
    challenge: result,
    agentMetrics: { devilMs: durationMs }
  };
};

const committeeNode = async (state) => {
  const reqId = state.requestId || 'N/A';
  console.log(`[Committee Agent] [${reqId}] Pacing call and running Committee Node...`);
  console.log("Committee Agent Input Score", state.evidenceMetrics ? state.evidenceMetrics.evidenceQualityScore : "N/A");
  await sleep(1500); // Prevent 429/503 on Free Tier API keys by pacing requests
  if (!state.research || !state.scorecard || !state.challenge) {
    throw new Error("Missing research, scorecard, or challenge report in graph state");
  }
  const sessionId = state.sessionId;
  if (sessionId) {
    executionTracker.startAgent(sessionId, "Committee Agent");
  }

  const sourcesUsed = state.evidence ? state.evidence.length : 0;
  const startTime = Date.now();
  const result = await runCommitteeAgent(
    state.research,
    state.scorecard,
    state.challenge,
    sourcesUsed,
    state.evidenceMetrics,
    []
  );
  const durationMs = Date.now() - startTime;

  if (sessionId) {
    executionTracker.completeAgent(sessionId, "Committee Agent", "Issued final recommendation.");
  }

  const currentMetrics = state.agentMetrics || {};
  const totalMs = (currentMetrics.researchMs || 0) + 
                  (currentMetrics.scoringMs || 0) + 
                  (currentMetrics.devilMs || 0) + 
                  durationMs;

  return { 
    finalDecision: result,
    agentMetrics: { 
      committeeMs: durationMs,
      totalMs: totalMs
    }
  };
};

// Build the LangGraph workflow structure
const workflow = new StateGraph(GraphState)
  .addNode("evidence_collection", evidenceNode)
  .addNode("research_agent", researchNode)
  .addNode("scoring_agent", scoringNode)
  .addNode("devil_advocate_agent", devilAdvocateNode)
  .addNode("committee_agent", committeeNode)
  
  // Set parallel entry points for data gathering from the start
  .addEdge(START, "evidence_collection")
  .addEdge("evidence_collection", "research_agent")
  .addEdge("research_agent", "scoring_agent")
  .addEdge("scoring_agent", "devil_advocate_agent")
  .addEdge("devil_advocate_agent", "committee_agent")
  .addEdge("committee_agent", END);

export const investmentGraph = workflow.compile();
