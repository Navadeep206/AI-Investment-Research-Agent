import { StateGraph, Annotation } from "@langchain/langgraph";
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
  }),
  failedNodes: Annotation({
    reducer: (x, y) => {
      const prev = Array.isArray(x) ? x : [];
      const next = Array.isArray(y) ? y : y ? [y] : [];
      return prev.concat(next);
    },
    default: () => []
  })
});

/**
 * Executes an agent function with a single retry circuit breaker policy.
 * Returns { result: data, failed: [agentName] | null }
 */
const runWithCircuitBreaker = async (nodeName, agentFn, fallbackValue) => {
  try {
    const res = await agentFn();
    return { result: res, failed: null };
  } catch (err1) {
    console.warn(`[Circuit Breaker] ${nodeName} Attempt 1 failed: ${err1.message}. Retrying once...`);
    try {
      const res = await agentFn();
      return { result: res, failed: null };
    } catch (err2) {
      console.error(`[Circuit Breaker] ${nodeName} failed after retry: ${err2.message}. Utilizing fallback response.`);
      return { result: fallbackValue, failed: [nodeName] };
    }
  }
};

// Graph node implementations with circuit breakers
const researchNode = async (state) => {
  const reqId = state.requestId || 'N/A';
  console.log(`[Research Agent] [${reqId}] Running Research Node...`);
  if (!state.companyData) {
    throw new Error("Missing companyData in graph state");
  }
  const sessionId = state.sessionId;
  if (sessionId) {
    executionTracker.startAgent(sessionId, "Research Agent");
  }

  const fallback = {
    businessOverview: "Fallback: The research node failed to load official business details.",
    revenueDrivers: "Fallback: Primary revenue drivers could not be determined.",
    competitiveAdvantages: ["Fallback: Data not found."],
    growthCatalysts: ["Fallback: Catalysts not found."],
    bullCase: "Fallback: Bull case could not be compiled."
  };

  const startTime = Date.now();
  const wrapFn = () => runResearchAgent(state.companyData, state.evidence);
  const outcome = await runWithCircuitBreaker("Research Agent", wrapFn, fallback);
  const durationMs = Date.now() - startTime;

  if (sessionId) {
    if (outcome.failed) {
      executionTracker.completeAgent(sessionId, "Research Agent", "Warning: Research Agent failed. Loaded default fallback.");
    } else {
      executionTracker.completeAgent(sessionId, "Research Agent", "Generated company investment report.");
    }
  }

  return { 
    research: outcome.result,
    failedNodes: outcome.failed || [],
    agentMetrics: { researchMs: durationMs }
  };
};

const scoringNode = async (state) => {
  const reqId = state.requestId || 'N/A';
  console.log(`[Scoring Agent] [${reqId}] Running Scoring Node...`);
  if (!state.company || !state.research) {
    throw new Error("Missing company name or research report in graph state");
  }
  const sessionId = state.sessionId;
  if (sessionId) {
    executionTracker.startAgent(sessionId, "Scoring Agent");
  }

  const fallback = {
    businessQuality: 50,
    growthPotential: 50,
    competitiveMoat: 50,
    financialStrength: 50,
    riskLevel: 50,
    overallScore: 50,
    confidence: 50,
    recommendation: "WATCH"
  };

  const startTime = Date.now();
  const wrapFn = () => runScoringAgent(state.company, state.research);
  const outcome = await runWithCircuitBreaker("Scoring Agent", wrapFn, fallback);
  const durationMs = Date.now() - startTime;

  if (sessionId) {
    if (outcome.failed) {
      executionTracker.completeAgent(sessionId, "Scoring Agent", "Warning: Scoring Agent failed. Loaded default fallback.");
    } else {
      executionTracker.completeAgent(sessionId, "Scoring Agent", "Calculated investment scorecard.");
    }
  }

  return { 
    scorecard: outcome.result,
    failedNodes: outcome.failed || [],
    agentMetrics: { scoringMs: durationMs }
  };
};

const devilAdvocateNode = async (state) => {
  const reqId = state.requestId || 'N/A';
  console.log(`[Devil's Advocate] [${reqId}] Running Devil's Advocate Node...`);
  if (!state.company || !state.research || !state.scorecard) {
    throw new Error("Missing company name, research, or scorecard in graph state");
  }
  const sessionId = state.sessionId;
  if (sessionId) {
    executionTracker.startAgent(sessionId, "Devil Advocate Agent");
  }

  const fallback = {
    bearCase: "Fallback: Adversarial bear case could not be compiled.",
    keyConcerns: ["Fallback: Concerns not compiled."],
    hiddenRisks: ["Fallback: Hidden risks not compiled."],
    worstCaseScenario: "Fallback: Worst case scenario not compiled.",
    counterArguments: ["Fallback: Counter arguments not compiled."]
  };

  const startTime = Date.now();
  const wrapFn = () => runDevilAdvocateAgent(state.company, state.research, state.scorecard);
  const outcome = await runWithCircuitBreaker("Devil Advocate Agent", wrapFn, fallback);
  const durationMs = Date.now() - startTime;

  if (sessionId) {
    if (outcome.failed) {
      executionTracker.completeAgent(sessionId, "Devil Advocate Agent", "Warning: Devil's Advocate failed. Loaded default fallback.");
    } else {
      executionTracker.completeAgent(sessionId, "Devil Advocate Agent", "Generated bear case and risk analysis.");
    }
  }

  return { 
    challenge: outcome.result,
    failedNodes: outcome.failed || [],
    agentMetrics: { devilMs: durationMs }
  };
};

const committeeNode = async (state) => {
  const reqId = state.requestId || 'N/A';
  console.log(`[Committee Agent] [${reqId}] Running Committee Node...`);
  if (!state.research || !state.scorecard || !state.challenge) {
    throw new Error("Missing research, scorecard, or challenge report in graph state");
  }
  const sessionId = state.sessionId;
  if (sessionId) {
    executionTracker.startAgent(sessionId, "Committee Agent");
  }

  const sourcesUsed = state.evidence ? state.evidence.length : 0;
  const fallback = {
    recommendation: "WATCH",
    confidence: 50,
    reasoning: "Fallback: The final advisory committee node encountered execution failures and returned WATCH as a safety fallback.",
    keyFactors: ["System Node Failure"],
    sourcesUsed,
    evidenceQualityScore: state.evidenceMetrics ? state.evidenceMetrics.evidenceQualityScore : 50,
    tierBreakdown: {
      tierA: state.evidenceMetrics ? (state.evidenceMetrics.tierA || 0) : 0,
      tierB: state.evidenceMetrics ? (state.evidenceMetrics.tierB || 0) : 0,
      tierC: state.evidenceMetrics ? (state.evidenceMetrics.tierC || 0) : 0,
      tierD: state.evidenceMetrics ? (state.evidenceMetrics.tierD || 0) : 0
    },
    decisionOverrideReason: "System node failure triggered fallback response.",
    recommendationReasonCodes: ["SYSTEM_NODE_FAILURE"],
    dataQualityScore: 0,
    freshnessScore: 100,
    evidenceAgeMinutes: 0
  };

  const startTime = Date.now();
  const wrapFn = () => runCommitteeAgent(
    state.research,
    state.scorecard,
    state.challenge,
    sourcesUsed,
    state.evidenceMetrics,
    state.failedNodes || []
  );

  const outcome = await runWithCircuitBreaker("Committee Agent", wrapFn, fallback);
  const durationMs = Date.now() - startTime;

  if (sessionId) {
    if (outcome.failed) {
      executionTracker.completeAgent(sessionId, "Committee Agent", "Warning: Committee Agent failed. Loaded default fallback.");
    } else {
      executionTracker.completeAgent(sessionId, "Committee Agent", "Issued final recommendation.");
    }
  }

  const currentMetrics = state.agentMetrics || {};
  const totalMs = (currentMetrics.researchMs || 0) + 
                  (currentMetrics.scoringMs || 0) + 
                  (currentMetrics.devilMs || 0) + 
                  durationMs;

  return { 
    finalDecision: outcome.result,
    failedNodes: outcome.failed || [],
    agentMetrics: { 
      committeeMs: durationMs,
      totalMs: totalMs
    }
  };
};

// Build the LangGraph workflow structure
const workflow = new StateGraph(GraphState)
  .addNode("research_agent", researchNode)
  .addNode("scoring_agent", scoringNode)
  .addNode("devil_advocate_agent", devilAdvocateNode)
  .addNode("committee_agent", committeeNode)
  
  // Set execution flow
  .addEdge("__start__", "research_agent")
  .addEdge("research_agent", "scoring_agent")
  .addEdge("scoring_agent", "devil_advocate_agent")
  .addEdge("devil_advocate_agent", "committee_agent")
  .addEdge("committee_agent", "__end__");

export const investmentGraph = workflow.compile();
