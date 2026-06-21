import { z } from "zod";

/**
 * Zod validation schema for the Investment Committee Agent decision.
 */
export const committeeSchema = z.object({
  recommendation: z.enum(["INVEST", "WATCH", "PASS"]),
  confidence: z.number().min(0).max(100),
  reasoning: z.string().min(1),
  keyFactors: z.array(z.string()),
  sourcesUsed: z.number().int().nonnegative(),
  evidenceQualityScore: z.number().int().min(0).max(100),
  tierBreakdown: z.object({
    tierA: z.number().int().nonnegative(),
    tierB: z.number().int().nonnegative(),
    tierC: z.number().int().nonnegative(),
    tierD: z.number().int().nonnegative()
  }),
  decisionOverrideReason: z.string().nullable()
});
