import { z } from 'zod';

/**
 * Zod validation schema representing a challenged investment thesis from the Devil's Advocate Agent.
 */
export const devilAdvocateSchema = z.object({
  bearCase: z.string({
    required_error: 'bearCase is required',
    invalid_type_error: 'bearCase must be a string'
  }).min(1, 'bearCase cannot be empty'),

  keyConcerns: z.array(
    z.string().min(1, 'Key concern entry cannot be empty'),
    {
      required_error: 'keyConcerns is required',
      invalid_type_error: 'keyConcerns must be an array of strings'
    }
  ).min(1, 'At least one key concern factor is required'),

  hiddenRisks: z.array(
    z.string().min(1, 'Hidden risk entry cannot be empty'),
    {
      required_error: 'hiddenRisks is required',
      invalid_type_error: 'hiddenRisks must be an array of strings'
    }
  ).min(1, 'At least one hidden risk factor is required'),

  worstCaseScenario: z.string({
    required_error: 'worstCaseScenario is required',
    invalid_type_error: 'worstCaseScenario must be a string'
  }).min(1, 'worstCaseScenario cannot be empty'),

  counterArguments: z.array(
    z.string().min(1, 'Counter argument entry cannot be empty'),
    {
      required_error: 'counterArguments is required',
      invalid_type_error: 'counterArguments must be an array of strings'
    }
  ).min(1, 'At least one counter argument is required')
});
