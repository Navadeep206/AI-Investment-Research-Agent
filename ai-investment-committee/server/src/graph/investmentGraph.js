import { StateGraph, Annotation } from "@langchain/langgraph";
import { researchAgent } from "../agents/researchAgent.js";
import { riskAgent } from "../agents/riskAgent.js";
import { marketAgent } from "../agents/marketAgent.js";
import { devilAdvocateAgent } from "../agents/devilAdvocateAgent.js";
import { committeeAgent } from "../agents/committeeAgent.js";

// Define state annotation
const GraphState = Annotation.Root({
  messages: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  company: Annotation({
    reducer: (x, y) => y ?? x,
  }),
  decision: Annotation({
    reducer: (x, y) => y ?? x,
  })
});

// Build the LangGraph workflow structure
const workflow = new StateGraph(GraphState)
  .addNode("research", researchAgent)
  .addNode("risk", riskAgent)
  .addNode("market", marketAgent)
  .addNode("devil_advocate", devilAdvocateAgent)
  .addNode("committee", committeeAgent)
  
  // Set execution flow
  .addEdge("__start__", "research")
  .addEdge("research", "risk")
  .addEdge("risk", "market")
  .addEdge("market", "devil_advocate")
  .addEdge("devil_advocate", "committee")
  .addEdge("committee", "__end__");

export const investmentGraph = workflow.compile();
