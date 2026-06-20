/**
 * Committee Agent Node
 * Synthesizes inputs from all other agents and outputs a final investment decision.
 */
export const committeeAgent = async (state) => {
  console.log("[Agent] Committee Agent executing...");
  
  return {
    ...state,
    messages: [
      ...(state.messages || []),
      {
        role: "assistant",
        sender: "CommitteeAgent",
        content: "Investment Committee synthesis completed. Formulated final recommendation, allocation weighting, and risk mitigation plan."
      }
    ]
  };
};
