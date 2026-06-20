import { StateGraph, Annotation } from "@langchain/langgraph";
import { runResearchAgent } from "../agents/researchAgent.js";
import { runScoringAgent } from "../agents/scoringAgent.js";
import { runDevilAdvocateAgent } from "../agents/devilAdvocateAgent.js";
import { runCommitteeAgent } from "../agents/committeeAgent.js";

// Define the GraphState Annotation structure
const GraphState = Annotation.Root({
  company: Annotation({
    reducer: (x, y) => y ?? x,
  }),
  companyData: Annotation({
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
  })
});

// Graph node implementations calling respective functional runners
const researchNode = async (state) => {
  console.log("[Graph Node] Running Research Node...");
  if (!state.companyData) {
    throw new Error("Missing companyData in graph state");
  }
  const report = await runResearchAgent(state.companyData);
  return { research: report };
};

const scoringNode = async (state) => {
  console.log("[Graph Node] Running Scoring Node...");
  if (!state.company || !state.research) {
    throw new Error("Missing company name or research report in graph state");
  }
  const scorecard = await runScoringAgent(state.company, state.research);
  return { scorecard };
};

const devilAdvocateNode = async (state) => {
  console.log("[Graph Node] Running Devil's Advocate Node...");
  if (!state.company || !state.research || !state.scorecard) {
    throw new Error("Missing company name, research, or scorecard in graph state");
  }
  const challenge = await runDevilAdvocateAgent(state.company, state.research, state.scorecard);
  return { challenge };
};

const committeeNode = async (state) => {
  console.log("[Graph Node] Running Committee Node...");
  if (!state.research || !state.scorecard || !state.challenge) {
    throw new Error("Missing research, scorecard, or challenge report in graph state");
  }
  const finalDecision = await runCommitteeAgent(state.research, state.scorecard, state.challenge);
  return { finalDecision };
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
