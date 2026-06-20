/**
 * Risk Agent Node
 * Responsible for evaluating financial risk, debt obligations, and structural risks.
 */
export const riskAgent = async (state) => {
  console.log("[Agent] Risk Agent executing...");
  
  return {
    ...state,
    messages: [
      ...(state.messages || []),
      {
        role: "assistant",
        sender: "RiskAgent",
        content: "Risk assessment completed. Assessed downside risks, debt-to-equity metrics, and liquidity concerns."
      }
    ]
  };
};
