import { z } from 'zod';

/**
 * Zod validation schema representing a structured Equity Research Report.
 */
export const researchSchema = z.object({
  businessOverview: z.string({
    required_error: 'businessOverview is required',
    invalid_type_error: 'businessOverview must be a string'
  }).min(1, 'businessOverview cannot be empty'),

  revenueDrivers: z.array(
    z.string().min(1, 'Revenue driver entry cannot be empty'),
    {
      required_error: 'revenueDrivers is required',
      invalid_type_error: 'revenueDrivers must be an array of strings'
    }
  ).min(1, 'At least one revenue driver is required'),

  competitiveAdvantages: z.array(
    z.string().min(1, 'Competitive advantage entry cannot be empty'),
    {
      required_error: 'competitiveAdvantages is required',
      invalid_type_error: 'competitiveAdvantages must be an array of strings'
    }
  ).min(1, 'At least one competitive advantage is required'),

  growthCatalysts: z.array(
    z.string().min(1, 'Growth catalyst entry cannot be empty'),
    {
      required_error: 'growthCatalysts is required',
      invalid_type_error: 'growthCatalysts must be an array of strings'
    }
  ).min(1, 'At least one growth catalyst is required'),

  risks: z.array(
    z.string().min(1, 'Risk entry cannot be empty'),
    {
      required_error: 'risks is required',
      invalid_type_error: 'risks must be an array of strings'
    }
  ).min(1, 'At least one risk factor is required'),

  bullCase: z.string({
    required_error: 'bullCase is required',
    invalid_type_error: 'bullCase must be a string'
  }).min(1, 'bullCase cannot be empty')
});
